import { statsDb } from '../../../config/paths';
import { promises as fs } from 'fs';
import logger from '../../../utils/logger';

export async function addPokemonInPlayerTotalCaptures(guildId: string, playerName: string): Promise<void> {
  const raw = await fs.readFile(statsDb(guildId), 'utf-8');

  let stats = JSON.parse(raw) as { playerTotals?: Record<string, number> };

  const current = typeof stats?.playerTotals?.[playerName] === 'number' ? stats.playerTotals[playerName] : 0;
  logger.info(`Mise à jour du nombre de captures pour ${playerName}: = ${current}}`);
  stats = { ...(stats ?? {}), playerTotals: { ...(stats.playerTotals ?? {}), [playerName]: current + 1 } };
  logger.info(`Nouveau nombre de captures pour ${playerName} = -> ${current + 1}`);
  await fs.writeFile(statsDb(guildId), JSON.stringify(stats, null, 2), 'utf-8');
}