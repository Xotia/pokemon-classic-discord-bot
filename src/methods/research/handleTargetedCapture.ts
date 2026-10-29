import { EmbedBuilder } from "discord.js";
import { getGenerationByZone } from "../zones/getGenerationByZone";
import { getPokemonByRarity } from "../rarity/getPokemonByRarity";
import { getPokemonPool } from "../pokemon/getRandomPokemonFromRarity";
import { rarityList } from "../../config/rarity";
import { checkIfUserCanCatch } from "../cooldown/checkIfUserCanCatch";
import { readPlayers, updatePlayer } from "../../utils/jsonPlayers";
import { registerCapturedPokemon } from "../player/registerCapturedPokemon";
import { addAllStats } from "../stats/addAllStats";
import { isThePokemonGonnaBeShiny } from "../pokemon/isThePokemonGonnaBeShiny";
import { getCapturedPokemonHp } from "../pokemon/getCapturedPokemonHp";
import { buildCapturedPokemonEmbed } from "../embed/buildCapturedPokemonEmbed";
import { addXp } from "../xp/xp";
import { computeCaptureXp } from "../xp/computeCaptureXp";
import { getTargetedCaptureCost, TargetableRarity, TargetedCaptureMode } from "../../config/researchCost";
import { InsufficientResearchDataError } from "./InsufficientResearchDataError";
import { getLoggerForGuild } from "../../utils/logger";
import { Player } from "../../types/Player";
import { Pokemon } from "../../types/Pokemon";
import { findEventZone, getEventXpMultiplier } from "../../features/events/eventZones";

export interface TargetedCaptureTarget {
  userId: string;
  name: string;
}

export interface TargetedCaptureOptions {
  /**
   * true : capture ciblée payante (solde vérifié, coût débité, XP créditée en
   * données de recherche, cooldown de l'auteur appliqué).
   * false : capture cadeau (commande admin) : aucune donnée de recherche
   * créditée ni débitée, et le cooldown n'est ni vérifié ni consommé (il
   * porterait sur interaction.user, c'est-à-dire l'admin, pas sur le joueur
   * qui reçoit le Pokémon).
   */
  chargeCost: boolean;
  /**
   * Pool du tirage et prix (voir TargetedCaptureMode) : déjà capturés (coût ÷2),
   * jamais capturés (coût plein) ou tous (coût ÷1,5). Sans effet sur le coût
   * d'une capture cadeau (gratuite).
   */
  mode: TargetedCaptureMode;
}

/** Ids des Pokémon déjà capturés (clé présente dans captureList avec total > 0). */
export function getCapturedPokemonIds(player: Player | undefined): Set<number> {
  const ids = new Set<number>();
  for (const [key, stats] of Object.entries(player?.captureList ?? {})) {
    if ((stats?.total ?? 0) > 0) ids.add(Number(key));
  }
  return ids;
}

/** Retourne le Pokémon capturé, ou null si la capture a été refusée ou annulée. */
export async function handleTargetedCapture(
  interaction: any,
  guildId: string,
  zone: string,
  rarity: TargetableRarity,
  target: TargetedCaptureTarget,
  options: TargetedCaptureOptions,
): Promise<Pokemon | null> {
  const { chargeCost, mode } = options;
  // Une zone d'évènement n'appartient à aucune génération et n'est pas dans les
  // zones débloquées : elle est résolue à part, uniquement pendant l'évènement.
  const eventZone = findEventZone(zone);
  if (eventZone && !eventZone.isActive()) {
    await interaction.editReply("❌ Cette zone n'est plus accessible.");
    return null;
  }

  const targetZone = eventZone ? eventZone.zoneId : zone;
  const generation = eventZone
    ? eventZone.generationToken
    : getGenerationByZone(guildId, targetZone);
  if (!generation) {
    await interaction.editReply("Cette zone n'est pas débloquée ou n'existe pas.");
    return null;
  }

  // Le pool est borné AVANT le tirage selon le mode ; un pool vidé par ce filtre
  // annule la commande avant tout débit.
  let excludeIds: ReadonlySet<number> | undefined;
  let includeIds: ReadonlySet<number> | undefined;
  if (mode !== "all") {
    const capturedIds = getCapturedPokemonIds((await readPlayers(guildId))[target.userId]);
    const pool = getPokemonPool(guildId, rarity, generation, targetZone);
    const rarityFrench = rarityList.find((r) => r.rarity === rarity)?.french ?? rarity;
    if (mode === "uncaptured") {
      if (pool.length > 0 && pool.every((p) => capturedIds.has(p.id))) {
        await interaction.editReply(
          `Tu as déjà capturé les ${pool.length} Pokémon de rareté « ${rarityFrench} » de la zone « ${targetZone} » : la capture ciblée est annulée et aucune donnée de recherche n'a été dépensée.`,
        );
        return null;
      }
      excludeIds = capturedIds;
    } else {
      if (pool.length > 0 && !pool.some((p) => capturedIds.has(p.id))) {
        await interaction.editReply(
          `Tu n'as encore capturé aucun des ${pool.length} Pokémon de rareté « ${rarityFrench} » de la zone « ${targetZone} » : la capture ciblée est annulée et aucune donnée de recherche n'a été dépensée.`,
        );
        return null;
      }
      includeIds = capturedIds;
    }
  }

  const { pokemonCatched } = await getPokemonByRarity(
    guildId,
    generation,
    targetZone,
    rarity,
    excludeIds,
    includeIds,
  );
  if (!pokemonCatched) {
    await interaction.editReply(
      `Aucun Pokémon de rareté « ${rarity} » n'est disponible dans la zone « ${targetZone} ».`,
    );
    return null;
  }

  const cost = chargeCost ? getTargetedCaptureCost(rarity, mode) : 0;
  const userId = target.userId;

  const players = await readPlayers(guildId);
  const playerSnapshot = players[userId];
  if (!playerSnapshot) {
    await interaction.editReply("Impossible de récupérer ton profil de dresseur.");
    return null;
  }

  const currentBalance = playerSnapshot.researchData ?? 0;
  if (chargeCost && currentBalance < cost) {
    await interaction.editReply(
      `Données de recherche insuffisantes pour cette capture ciblée : coût ${cost}, solde actuel ${currentBalance}.`,
    );
    return null;
  }

  if (chargeCost) {
    const canCatch = await checkIfUserCanCatch(interaction, guildId, targetZone);
    if (!canCatch) return null;
  }

  const isShiny = isThePokemonGonnaBeShiny(guildId, targetZone);
  const gainedXp = computeCaptureXp(
    getCapturedPokemonHp(guildId, pokemonCatched.id),
    rarity,
    isShiny,
    getEventXpMultiplier(targetZone),
  );

  let remainingBalance = currentBalance;
  let newLevel = playerSnapshot.level ?? 1;

  try {
    await updatePlayer(guildId, userId, (fresh) => {
      const xpGain = addXp(fresh.xp ?? 0, gainedXp);
      fresh.xp = xpGain.xp;
      fresh.level = xpGain.level;

      // Capture cadeau : les données de recherche ne bougent pas du tout.
      if (chargeCost) {
        const freshBalance = fresh.researchData ?? 0;
        if (freshBalance < cost) {
          throw new InsufficientResearchDataError(cost, freshBalance);
        }
        fresh.researchData = freshBalance - cost + gainedXp;
      }

      registerCapturedPokemon(fresh, pokemonCatched.id, isShiny);

      remainingBalance = fresh.researchData;
      newLevel = xpGain.level;
    });
  } catch (error) {
    if (error instanceof InsufficientResearchDataError) {
      await interaction.editReply(
        `Données de recherche insuffisantes pour cette capture ciblée : coût ${error.cost}, solde actuel ${error.balance}.`,
      );
      return null;
    }

    getLoggerForGuild(guildId).error(
      `Erreur lors du débit de la capture ciblée pour ${userId} : ${error instanceof Error ? error.message : String(error)}`,
    );
    await interaction.editReply(
      "Une erreur est survenue lors du traitement de la capture ciblée. Réessaie plus tard.",
    );
    return null;
  }

  const previousLevel = playerSnapshot.level ?? 1;
  const leveledUp = newLevel > previousLevel;
  const trainerName = playerSnapshot.name ?? target.name;

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
    zone: targetZone,
  });

  if (embed instanceof EmbedBuilder) {
    const currentTitle = embed.data.title ?? "";
    if (chargeCost) {
      embed
        .setTitle(`🎯 Capture ciblée — ${currentTitle}`)
        .addFields(
          { name: "Coût (données de recherche)", value: `${cost}`, inline: true },
          { name: "Données de recherche restantes", value: `${remainingBalance}`, inline: true },
        );
    } else {
      embed.setTitle(`🎁 Capture offerte — ${currentTitle}`);
    }
  }

  await addAllStats(guildId, pokemonCatched, isShiny, playerForEmbed);

  // Capture cadeau : l'embed ne nomme pas le joueur, la mention le fait.
  await interaction.editReply(
    chargeCost ? { embeds: [embed] } : { content: `<@${userId}>`, embeds: [embed] },
  );

  getLoggerForGuild(guildId).info(
    `🎯 Capture ciblée : ${pokemonCatched.name} (Rareté = ${rarity}) (Zone = ${targetZone})${isShiny ? " (Shiny)" : ""}${!isInPokedex ? " (Nouveau dans le Pokédex)" : ""} | Coût = ${cost} | XP gagnée = ${gainedXp} | Niveau = ${newLevel}`,
  );

  return pokemonCatched;
}
