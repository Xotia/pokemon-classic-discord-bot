import { STATS_DB } from '../../../config/paths';
import { promises as fs } from 'fs';
import logger from '../../../utils/logger';

export async function addRandomShinyCaptureForPlayer(playerName: string): Promise<void> {
  try {
    const raw = await fs.readFile(STATS_DB, 'utf-8');
    const stats = JSON.parse(raw);

    if (!stats.random) stats.random = {};
    if (!stats.random.shinyCaptures) stats.random.shinyCaptures = {};

    stats.random.shinyCaptures[playerName] = 
      (stats.random.shinyCaptures[playerName] || 0) + 1;

    await fs.writeFile(STATS_DB, JSON.stringify(stats, null, 2), 'utf-8');
    
    logger.info(`✨ ${playerName} → random.shinyCaptures: ${stats.random.shinyCaptures[playerName]}`);
    
  } catch (error) {
    console.error('❌ Erreur addRandomShinyCaptureForPlayer:', (error as Error).message);
    throw error;
  }
}
