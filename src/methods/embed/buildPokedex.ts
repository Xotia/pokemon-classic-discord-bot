import { getPokemonName } from "../pokemon/getPokemonName";
import { getLoggerForGuild } from "../../utils/logger";
import { Player } from "../../types/Player";

export async function buildPokedexEntry(
  guildId: string,
  pokemonId: number,
  player: Player,
): Promise<string | null> {
  const pokemonName = await getPokemonName(guildId, pokemonId);
  const stats = player.captureList?.[String(pokemonId)];

  if (!pokemonName || !stats) {
    return null;
  }

  const shinyCount = stats.shiny > 0 ? ` ✨${stats.shiny}` : "";
  const seasonMarker = stats.capturedInCurrentSeason ? " 🎯" : "";

  return `**${pokemonId}** - ${pokemonName} (${stats.total})${shinyCount}${seasonMarker}`;
}

export async function buildPokedex(
  guildId: string,
  captureList: number[],
  player: Player,
): Promise<string> {
  if (!captureList || captureList.length === 0) {
    return "Ton Pokédex est vide.";
  }

  const entries = await Promise.all(
    captureList
      .sort((a, b) => a - b)
      .map((pokemonId) => buildPokedexEntry(guildId, pokemonId, player)),
  );

  const result = entries.filter(Boolean).join("\n");

  const logger = getLoggerForGuild(guildId);
  logger.info("Pokedex construit :");
  logger.info(result);

  return result.trim();
}