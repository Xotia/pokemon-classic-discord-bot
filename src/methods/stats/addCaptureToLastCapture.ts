import { STATS_DB } from '../../config/paths';
import { promises as fs } from 'fs';
import logger from '../../utils/logger';

export function addCaptureToLastCapture(playerName: string, pokemonId: number): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const raw = await fs.readFile(STATS_DB, 'utf-8');
            const stats = JSON.parse(raw);
            stats.lastPokemonCaptured = {
                player: playerName,
                pokemon: pokemonId
            };
            await fs.writeFile(STATS_DB, JSON.stringify(stats, null, 2), 'utf-8');
            logger.info(`✅ Mise à jour de lastPokemonCaptured: ${playerName} a capturé le Pokémon ID ${pokemonId}`);
            resolve();
        } catch (error) {
            logger.info(`❌ Erreur addCaptureToLastCapture: ${(error as Error).message}`);
            reject(error);
        }
    });
};