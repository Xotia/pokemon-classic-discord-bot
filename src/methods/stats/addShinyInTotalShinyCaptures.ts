import { statsDb } from '../../config/paths';
import { promises as fs } from 'fs';
import logger from '../../utils/logger';

export async function addShinyInTotalShinyCaptures(guildId: string): Promise<void> {
  try {
    const raw = await fs.readFile(statsDb(guildId), 'utf-8');
    const stats = JSON.parse(raw);

    stats.totalShinyCaptures = (stats.totalShinyCaptures || 0) + 1;

    await fs.writeFile(statsDb(guildId), JSON.stringify(stats, null, 2), 'utf-8');
    
    logger.info(`✨ totalShinyCaptures → ${stats.totalShinyCaptures}`);
    
  } catch (error) {
    console.error('❌ Erreur addShinyCapture:', (error as Error).message);
    logger.info(`❌ Erreur addShinyCapture: ${(error as Error).message}`);
    throw error;
  }
}
