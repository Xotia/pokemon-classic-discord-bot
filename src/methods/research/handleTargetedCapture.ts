import { EmbedBuilder } from "discord.js";
import { getGenerationByZone } from "../zones/getGenerationByZone";
import { getPokemonByRarity } from "../rarity/getPokemonByRarity";
import { checkIfUserCanCatch } from "../cooldown/checkIfUserCanCatch";
import { readPlayers, updatePlayer } from "../../utils/jsonPlayers";
import { registerCapturedPokemon } from "../player/registerCapturedPokemon";
import { addAllStats } from "../stats/addAllStats";
import { isThePokemonGonnaBeShiny } from "../pokemon/isThePokemonGonnaBeShiny";
import { getCapturedPokemonHp } from "../pokemon/getCapturedPokemonHp";
import { buildCapturedPokemonEmbed } from "../embed/buildCapturedPokemonEmbed";
import { addXp } from "../xp/xp";
import { getResearchCost, TargetableRarity } from "../../config/researchCost";
import { InsufficientResearchDataError } from "./InsufficientResearchDataError";
import { getLoggerForGuild } from "../../utils/logger";
import { Player } from "../../types/Player";

export async function handleTargetedCapture(
  interaction: any,
  guildId: string,
  zone: string,
  rarity: TargetableRarity,
): Promise<void> {
  const generation = getGenerationByZone(guildId, zone);
  if (!generation) {
    await interaction.editReply("Cette zone n'est pas débloquée ou n'existe pas.");
    return;
  }

  const { pokemonCatched } = await getPokemonByRarity(guildId, generation, zone, rarity);
  if (!pokemonCatched) {
    await interaction.editReply(
      `Aucun Pokémon de rareté « ${rarity} » n'est disponible dans la zone « ${zone} ».`,
    );
    return;
  }

  const cost = getResearchCost(rarity);
  const userId = interaction.user.id;

  const players = await readPlayers(guildId);
  const playerSnapshot = players[userId];
  if (!playerSnapshot) {
    await interaction.editReply("Impossible de récupérer ton profil de dresseur.");
    return;
  }

  const currentBalance = playerSnapshot.researchData ?? 0;
  if (currentBalance < cost) {
    await interaction.editReply(
      `Données de recherche insuffisantes pour cette capture ciblée : coût ${cost}, solde actuel ${currentBalance}.`,
    );
    return;
  }

  const canCatch = await checkIfUserCanCatch(interaction, guildId, zone);
  if (!canCatch) return;

  const isShiny = isThePokemonGonnaBeShiny(guildId);
  const baseXp = getCapturedPokemonHp(guildId, pokemonCatched.id);
  const gainedXp = isShiny ? baseXp * 10 : baseXp;

  let remainingBalance = 0;
  let newLevel = playerSnapshot.level ?? 1;

  try {
    await updatePlayer(guildId, userId, (fresh) => {
      const freshBalance = fresh.researchData ?? 0;
      if (freshBalance < cost) {
        throw new InsufficientResearchDataError(cost, freshBalance);
      }

      fresh.researchData = freshBalance - cost;

      const xpGain = addXp(fresh.xp ?? 0, gainedXp);
      fresh.xp = xpGain.xp;
      fresh.level = xpGain.level;

      fresh.researchData = (fresh.researchData ?? 0) + gainedXp;

      registerCapturedPokemon(fresh, pokemonCatched.id, isShiny);

      remainingBalance = fresh.researchData;
      newLevel = xpGain.level;
    });
  } catch (error) {
    if (error instanceof InsufficientResearchDataError) {
      await interaction.editReply(
        `Données de recherche insuffisantes pour cette capture ciblée : coût ${error.cost}, solde actuel ${error.balance}.`,
      );
      return;
    }

    getLoggerForGuild(guildId).error(
      `Erreur lors du débit de la capture ciblée pour ${userId} : ${error instanceof Error ? error.message : String(error)}`,
    );
    await interaction.editReply(
      "Une erreur est survenue lors du traitement de la capture ciblée. Réessaie plus tard.",
    );
    return;
  }

  const previousLevel = playerSnapshot.level ?? 1;
  const leveledUp = newLevel > previousLevel;
  const trainerName = playerSnapshot.name;

  // Snapshot local utilisé uniquement pour la construction de l'embed :
  // sa captureList reflète volontairement l'état AVANT enregistrement de la
  // capture (registerCapturedPokemon n'a été appelé que sur `fresh`, jamais
  // sur cet objet), afin que buildCapturedPokemonEmbed détecte correctement
  // s'il s'agit d'un nouveau Pokémon pour le pokédex.
  const playerForEmbed: Player = {
    ...playerSnapshot,
    xp: (() => {
      const xpGain = addXp(playerSnapshot.xp ?? 0, gainedXp);
      return xpGain.xp;
    })(),
    level: newLevel,
    researchData: remainingBalance,
  };

  const { embed, isInPokedex } = buildCapturedPokemonEmbed({
    guildId,
    player: playerForEmbed,
    playerId: userId,
    pokemon: pokemonCatched,
    isShiny,
    trainerName,
    gainedXp,
    leveledUp,
    newLevel,
    zone,
  });

  if (embed instanceof EmbedBuilder) {
    const currentTitle = embed.data.title ?? "";
    embed
      .setTitle(`🎯 Capture ciblée — ${currentTitle}`)
      .addFields(
        { name: "Coût (données de recherche)", value: `${cost}`, inline: true },
        { name: "Données de recherche restantes", value: `${remainingBalance}`, inline: true },
      );
  }

  await addAllStats(guildId, pokemonCatched, isShiny, playerForEmbed);

  await interaction.editReply({ embeds: [embed] });

  getLoggerForGuild(guildId).info(
    `🎯 Capture ciblée : ${pokemonCatched.name} (Rareté = ${rarity}) (Zone = ${zone})${isShiny ? " (Shiny)" : ""}${!isInPokedex ? " (Nouveau dans le Pokédex)" : ""} | Coût = ${cost} | XP gagnée = ${gainedXp} | Niveau = ${newLevel}`,
  );
}
