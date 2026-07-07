import { statsDb } from '../../config/paths';
import { promises as fs } from 'fs';
import logger from '../../utils/logger';

export async function isThisPokemonSameAsLastCapture(guildId: string, pokemonId: number): Promise<boolean> {
    try {
        const raw = await fs.readFile(statsDb(guildId), 'utf-8');
        const data = JSON.parse(raw);
        const lastCaptured = data.lastPokemonCaptured?.pokemon;
        if (lastCaptured === undefined) {
            logger.info('Aucun Pokémon capturé précédemment.');
            return false;
        }
        if (lastCaptured === pokemonId) {
            logger.info(`Le Pokémon capturé (ID: ${pokemonId}) est le même que le dernier capturé.`);
            return true;
        } else {
            logger.info(`Le Pokémon capturé (ID: ${pokemonId}) est différent du dernier capturé (ID: ${lastCaptured}).`);
            return false;
        }
    } catch (error) {
        logger.info(`❌ Erreur isThisPokemonSameAsLastCapture: ${(error as Error).message}`);
        return false;
    }
}