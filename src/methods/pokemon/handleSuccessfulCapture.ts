import logger from "../../utils/logger";
import { displayLogs } from "../console-logs/displayLogs";
import { buildCapturedPokemonEmbed } from "../embed/buildCapturedPokemonEmbed";
import { registerCapturedPokemon } from "../player/registerCapturedPokemon";
import { savePlayerData } from "../player/savePlayerData";
import { addAllStats } from "../stats/addAllStats";
import { isThePokemonGonnaBeShiny } from "./isThePokemonGonnaBeShiny";
import { addXp } from "../xp/xp";
import { getCapturedPokemonHp } from "./getCapturedPokemonHp";

export async function handleSuccessfulCapture(
  interaction: any,
  player: any,
  pokemonCatched: any,
  rarity: string,
  zone: string,
) {
  const isShiny = isThePokemonGonnaBeShiny();
  const trainerName = player.name;

  const currentXp = typeof player.xp === "number" ? player.xp : 0;
  const previousLevel = typeof player.level === "number" ? player.level : 1;

  const baseXp = getCapturedPokemonHp(pokemonCatched.id);
  const gainedXp = isShiny ? baseXp * 10 : baseXp;
  const xpResult = addXp(currentXp, gainedXp);
  const leveledUp = xpResult.level > previousLevel;

  player.xp = xpResult.xp;
  player.level = xpResult.level;

  const { embed, footer, isInPokedex } = buildCapturedPokemonEmbed({
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

  logger.info(
    `🎉 Capturé: ${pokemonCatched.name} (Rareté = ${rarity}) (Zone = ${zone})${isShiny ? " (Shiny)" : ""}${!isInPokedex ? " (Nouveau dans le Pokédex)" : ""} | XP gagnée = ${gainedXp} | Niveau = ${xpResult.level}`,
  );

  await interaction.editReply({ embeds: [embed] });

  displayLogs(interaction, pokemonCatched, isShiny, !isInPokedex, footer);

  registerCapturedPokemon(player, pokemonCatched.id, isShiny);

  await addAllStats(pokemonCatched, isShiny, player);
  savePlayerData(interaction, player);
}
