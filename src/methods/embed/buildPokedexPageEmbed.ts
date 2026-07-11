import { EmbedBuilder } from "discord.js";
import { getTotalPokemonNumber } from "../pokedex/getTotalPokemonNumber";
import { getPokedexCaptureIds } from "../pokedex/getPokedexCaptureIds";
import { buildPokedex } from "./buildPokedex";

import { Player } from "../../types/Player";

export async function buildPokedexPageEmbed(
  interaction: any,
  guildId: string,
  player: Player,
  page: number,
  totalPages: number,
  pokemonPerPage: number,
) {
  const captureIds = getPokedexCaptureIds(player);
  const totalPokemonNumber = getTotalPokemonNumber(guildId);

  const start = page * pokemonPerPage;
  const end = Math.min(start + pokemonPerPage, captureIds.length);
  const pageCaptureList = captureIds.slice(start, end);

  const pokedex = await buildPokedex(guildId, pageCaptureList, player);

  const trainerName =
    player.name || interaction.user.globalName || interaction.user.username;
  const playerLevel = typeof player.level === "number" ? player.level : 1;

  const uniqueCount = captureIds.length;
  const remainingCount = totalPokemonNumber - uniqueCount;

  const seasonCount = Object.values(player.captureList ?? {})
    .filter((stats) => stats.capturedInCurrentSeason).length;

  const summary = [
    `👤 **Joueur :** ${trainerName}`,
    `⭐ **Niveau :** ${playerLevel}`,
    `📖 **Pokédex :** ${uniqueCount}/${totalPokemonNumber}`,
    `🎯 **Saison :** ${seasonCount} capturés`,
  ].join("\n");

  const footer = `Page ${page + 1}/${totalPages} • ${remainingCount} restants`;

  return new EmbedBuilder()
    .setTitle("📘 Pokédex")
    .setDescription(`${summary}\n\n${pokedex}`)
    .setColor(0x0099ff)
    .setFooter({ text: footer });
}