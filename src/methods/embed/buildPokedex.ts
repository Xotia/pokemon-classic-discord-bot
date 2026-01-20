import { getPokemonName } from "../pokemon/getPokemonName";
import logger from "../../utils/logger";
import { Player } from "../../types/Player";

export async function buildPokedex(
  randomCaptures: number[], 
  player: Player
): Promise<string> {
  if (!randomCaptures || randomCaptures.length === 0) {
    return "Ton Pokédex est vide.";
  }

  let entries = '';
  
  for (const pokemonId of randomCaptures.sort((a, b) => a - b)) {
    const pokemonName = await getPokemonName(pokemonId);
    
    if (pokemonName && player.randomCaptures?.[pokemonId]) { 
      const stats = player.randomCaptures[pokemonId];
      const shinyCount = stats.shiny > 0 ? ` ✨${stats.shiny}` : '';

      entries += `**${pokemonId}** - ${pokemonName} (${stats.total})${shinyCount}\n`;
    }
  }

  logger.info("Pokedex construit :");
  logger.info(entries);

  return entries.trim();
}
