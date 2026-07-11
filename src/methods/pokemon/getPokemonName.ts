import { getPokemonCatalog } from '../../utils/pokemonCatalog';
import logger from '../../utils/logger';

export async function getPokemonName(guildId: string, pokemonId: number): Promise<string | null> {
    try {
        const catalog = getPokemonCatalog(guildId);
        const pokemon = catalog.find((p) => p.id === pokemonId);

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
