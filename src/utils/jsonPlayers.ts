import { promises as fs } from 'fs';
import { PLAYERS_DB } from '../config/paths';
import logger from './logger';
import { Player } from '../types/Player';

export async function readPlayers(): Promise<{ [userId: string]: Player }> {
  try {
    const data = await fs.readFile(PLAYERS_DB, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {}; // Fichier vide ou inexistant
  }
}

export async function writePlayers(players: { [userId: string]: Player }): Promise<void> {
  await fs.writeFile(PLAYERS_DB, JSON.stringify(players, null, 2), 'utf8');
}

export async function updatePlayer(userId: string, updateFn: (player: Player) => void): Promise<void> {
  const players = await readPlayers();
  const player = players[userId] || { name: '', randomCaptures: [], pokedex: [] };
  updateFn(player);
  players[userId] = player;
  await writePlayers(players);
}