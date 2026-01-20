import { STATS_DB } from '../../../config/paths';
import { promises as fs } from 'fs';
import logger from '../../../utils/logger';

export async function addPokemonInPlayerRandomTotalCaptures(playerName: string): Promise<void> {
  const raw = await fs.readFile(STATS_DB, 'utf-8');

  const stats = JSON.parse(raw) as { random?: { playerTotals?: Record<string, number> } };

  const current = typeof stats.random?.playerTotals?.[playerName] === 'number' ? stats.random.playerTotals[playerName] : 0;
  logger.info(`Mise à jour du nombre de captures pour ${playerName}: = ${current}}`);
  stats.random = { ...(stats.random ?? {}), playerTotals: { ...(stats.random?.playerTotals ?? {}), [playerName]: current + 1 } };
  logger.info(`Nouveau nombre de captures pour ${playerName} = -> ${current + 1}`);
  await fs.writeFile(STATS_DB, JSON.stringify(stats, null, 2), 'utf-8');
}