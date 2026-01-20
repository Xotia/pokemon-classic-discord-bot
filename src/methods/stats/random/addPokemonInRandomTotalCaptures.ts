import { STATS_DB } from '../../../config/paths';
import { promises as fs } from 'fs';
import logger from '../../../utils/logger';

export async function addPokemonInRandomTotalCaptures(): Promise<void> {
  const raw = await fs.readFile(STATS_DB, 'utf-8');
  const stats = JSON.parse(raw) as { random?: { totalCaptures?: number } };

  const current = typeof stats.random?.totalCaptures === 'number' ? stats.random.totalCaptures : 0;
  logger.info(`Mise à jour des captures totales: totalCaptures = ${current}}`);
  stats.random = { ...stats.random, totalCaptures: current + 1 };
  logger.info(`totalCaptures = -> ${current + 1}`);
  await fs.writeFile(STATS_DB, JSON.stringify(stats, null, 2), 'utf-8');
}