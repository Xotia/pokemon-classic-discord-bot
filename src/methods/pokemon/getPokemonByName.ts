import { POKEMON_DB } from "../../config/paths";
import logger from "../../utils/logger";
import { promises as fs } from "fs";
import { Pokemon } from "../../types/Pokemon";

let pokemonCache: Pokemon[] | null = null;

export async function getPokemonByName(name: string): Promise<Pokemon | null> {
  try {
    if (!pokemonCache) {
      const raw = await fs.readFile(POKEMON_DB, "utf-8");
      pokemonCache = JSON.parse(raw) as Pokemon[];
    }

    const normalizedName = name.trim().toLowerCase();
    const pokemon =
      pokemonCache.find((p) => p.name.trim().toLowerCase() === normalizedName) ??
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