import { getLoggerForGuild } from "../../utils/logger";
import { displayLogs } from "../console-logs/displayLogs";
import { buildCapturedPokemonEmbed } from "../embed/buildCapturedPokemonEmbed";
import { registerCapturedPokemon } from "../player/registerCapturedPokemon";
import { updatePlayer } from "../../utils/jsonPlayers";
import { addAllStats } from "../stats/addAllStats";
import { isThePokemonGonnaBeShiny } from "./isThePokemonGonnaBeShiny";
import { addXp } from "../xp/xp";
import { getCapturedPokemonHp } from "./getCapturedPokemonHp";

export async function handleSuccessfulCapture(
  interaction: any,
  guildId: string,
  player: any,
  pokemonCatched: any,
  rarity: string,
  zone: string,
) {
  const isShiny = isThePokemonGonnaBeShiny(guildId);
  const trainerName = player.name;

  const currentXp = typeof player.xp === "number" ? player.xp : 0;
  const previousLevel = typeof player.level === "number" ? player.level : 1;

  const baseXp = getCapturedPokemonHp(guildId, pokemonCatched.id);
  const gainedXp = isShiny ? baseXp * 10 : baseXp;
  const xpResult = addXp(currentXp, gainedXp);
  const leveledUp = xpResult.level > previousLevel;

  player.xp = xpResult.xp;
  player.level = xpResult.level;
  player.researchData = (typeof player.researchData === "number" ? player.researchData : 0) + gainedXp;

  const { embed, footer, isInPokedex } = buildCapturedPokemonEmbed({
    guildId,
    player,
    playerId: interaction.user.id,
    pokemon: pokemonCatched,
    isShiny,
    trainerName,
    gainedXp,
    leveledUp,
    newLevel: xpResult.level,
    zone,
  });

  getLoggerForGuild(guildId).info(
    `🎉 Capturé: ${pokemonCatched.name} (Rareté = ${rarity}) (Zone = ${zone})${isShiny ? " (Shiny)" : ""}${!isInPokedex ? " (Nouveau dans le Pokédex)" : ""} | XP gagnée = ${gainedXp} | Niveau = ${xpResult.level}`,
  );

  await interaction.editReply({ embeds: [embed] });

  displayLogs(guildId, interaction, pokemonCatched, isShiny, !isInPokedex, footer);

  registerCapturedPokemon(player, pokemonCatched.id, isShiny);

  await addAllStats(guildId, pokemonCatched, isShiny, player);

  await updatePlayer(guildId, interaction.user.id, (fresh) => {
    const xpGain = addXp(typeof fresh.xp === "number" ? fresh.xp : 0, gainedXp);
    fresh.xp = xpGain.xp;
    fresh.level = xpGain.level;
    fresh.researchData = (typeof fresh.researchData === "number" ? fresh.researchData : 0) + gainedXp;
    fresh.pityCounter = player.pityCounter;
    registerCapturedPokemon(fresh, pokemonCatched.id, isShiny);
  });
}
