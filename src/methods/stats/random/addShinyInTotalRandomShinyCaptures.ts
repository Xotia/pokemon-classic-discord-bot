import { STATS_DB } from '../../../config/paths';
import { promises as fs } from 'fs';
import logger from '../../../utils/logger';

export async function addShinyInTotalRandomShinyCaptures(): Promise<void> {
  try {
    const raw = await fs.readFile(STATS_DB, 'utf-8');
    const stats = JSON.parse(raw);

    stats.random.totalShinyCaptures = (stats.random.totalShinyCaptures || 0) + 1;

    await fs.writeFile(STATS_DB, JSON.stringify(stats, null, 2), 'utf-8');
    
    logger.info(`✨ totalShinyCaptures → ${stats.random.totalShinyCaptures}`);
    
  } catch (error) {
    console.error('❌ Erreur addShinyCapture:', (error as Error).message);
    logger.info(`❌ Erreur addShinyCapture: ${(error as Error).message}`);
    throw error;
  }
}
