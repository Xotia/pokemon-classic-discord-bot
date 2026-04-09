import { STATS_DB } from '../../../config/paths';
import { promises as fs } from 'fs';
import logger from '../../../utils/logger';

export async function addShinyCaptureForPlayer(playerName: string): Promise<void> {
  try {
    const raw = await fs.readFile(STATS_DB, 'utf-8');
    let stats = JSON.parse(raw);

    if (!stats) stats = {};
    if (!stats.shinyCaptures) stats.shinyCaptures = {};

    stats.shinyCaptures[playerName] = 
      (stats.shinyCaptures[playerName] || 0) + 1;

    await fs.writeFile(STATS_DB, JSON.stringify(stats, null, 2), 'utf-8');
    
    logger.info(`✨ ${playerName} → shinyCaptures: ${stats.shinyCaptures[playerName]}`);
    
  } catch (error) {
    console.error('❌ Erreur addShinyCaptureForPlayer:', (error as Error).message);
    throw error;
  }
}
