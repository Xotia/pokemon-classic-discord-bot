import { getPokemonName } from "../pokemon/getPokemonName";
import logger from "../../utils/logger";
import { Player } from "../../types/Player";

export async function buildPokedex(
  captureList: number[], 
  player: Player
): Promise<string> {
  if (!captureList || captureList.length === 0) {
    return "Ton Pokédex est vide.";
  }

  let entries = '';
  
  for (const pokemonId of captureList.sort((a, b) => a - b)) {
    const pokemonName = await getPokemonName(pokemonId);
    
    if (pokemonName && player.captureList?.[pokemonId]) { 
      const stats = player.captureList[pokemonId];
      const shinyCount = stats.shiny > 0 ? ` ✨${stats.shiny}` : '';

      entries += `**${pokemonId}** - ${pokemonName} (${stats.total})${shinyCount}\n`;
    }
  }

  logger.info("Pokedex construit :");
  logger.info(entries);

  return entries.trim();
}
