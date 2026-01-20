import { POKEMON_DB } from '../../config/paths';
import logger from '../../utils/logger';
import { promises as fs } from 'fs';
import { Pokemon } from '../../types/Pokemon';

let pokemonCache: Pokemon[] | null = null;

export async function getPokemonName(pokemonId: number): Promise<string | null> {
    try {
        if (!pokemonCache) {
            const raw = await fs.readFile(POKEMON_DB, 'utf-8');
            pokemonCache = JSON.parse(raw) as Pokemon[];
        }

        const pokemon = pokemonCache.find((p: Pokemon) => p.id === pokemonId);

        if (pokemon) {
            logger.info(`Pokémon trouvé: ID ${pokemonId}, Nom ${pokemon.name}`);
            return pokemon.name;
        } else {
            logger.info(`Aucun Pokémon trouvé avec l'ID ${pokemonId}`);
            return null;
        }
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
        logger.error(`getPokemonName ${pokemonId} → ${errorMsg}`);
        return null;
    }
}