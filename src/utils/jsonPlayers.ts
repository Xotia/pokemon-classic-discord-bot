import { promises as fs } from 'fs';
import { playersDb } from '../config/paths';
import { Player } from '../types/Player';
import { withFileLock } from './fileLock';

export async function readPlayers(guildId: string): Promise<{ [userId: string]: Player }> {
  try {
    const data = await fs.readFile(playersDb(guildId), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

export async function writePlayers(guildId: string, players: { [userId: string]: Player }): Promise<void> {
  await fs.writeFile(playersDb(guildId), JSON.stringify(players, null, 2), 'utf8');
}

export async function updatePlayer(guildId: string, userId: string, updateFn: (player: Player) => void): Promise<void> {
  return withFileLock(playersDb(guildId), async () => {
    const players = await readPlayers(guildId);
    const player = players[userId];
    if (!player) {
      throw new Error(`Player with ID ${userId} not found`);
    }
    updateFn(player);
    players[userId] = player;
    await writePlayers(guildId, players);
  });
}

export async function updatePlayers(guildId: string, updateFn: (players: { [userId: string]: Player }) => void): Promise<void> {
  return withFileLock(playersDb(guildId), async () => {
    const players = await readPlayers(guildId);
    updateFn(players);
    await writePlayers(guildId, players);
  });
}