import { statsDb } from '../../../config/paths';
import { promises as fs } from 'fs';
import { getLoggerForGuild } from '../../../utils/logger';

export async function addShinyCaptureForPlayer(guildId: string, playerName: string): Promise<void> {
  const logger = getLoggerForGuild(guildId);
  try {
    const raw = await fs.readFile(statsDb(guildId), 'utf-8');
    let stats = JSON.parse(raw);

    if (!stats) stats = {};
    if (!stats.shinyCaptures) stats.shinyCaptures = {};

    stats.shinyCaptures[playerName] =
      (stats.shinyCaptures[playerName] || 0) + 1;

    await fs.writeFile(statsDb(guildId), JSON.stringify(stats, null, 2), 'utf-8');
    
    logger.info(`✨ ${playerName} → shinyCaptures: ${stats.shinyCaptures[playerName]}`);
    
  } catch (error) {
    console.error('❌ Erreur addShinyCaptureForPlayer:', (error as Error).message);
    throw error;
  }
}
