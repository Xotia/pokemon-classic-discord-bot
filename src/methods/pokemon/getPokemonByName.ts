import { getPokemonCatalog } from "../../utils/pokemonCatalog";
import logger from "../../utils/logger";
import { Pokemon } from "../../types/Pokemon";

export async function getPokemonByName(guildId: string, name: string): Promise<Pokemon | null> {
  try {
    const catalog = getPokemonCatalog(guildId);
    const normalizedName = name.trim().toLowerCase();
    const pokemon =
      catalog.find((p) => p.name.trim().toLowerCase() === normalizedName) ??
      null;

    if (pokemon) {
      logger.info(`Pokémon trouvé: ${pokemon.name} (ID ${pokemon.id})`);
      return pokemon;
    }

    logger.info(`Aucun Pokémon trouvé avec le nom ${name}`);
    return null;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";
    logger.error(`getPokemonByName ${name} → ${errorMsg}`);
    return null;
  }
}
