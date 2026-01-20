import fs from 'fs';
import { PLAYERS_DB } from '../config/paths';

import { Player } from '../types/Player';

const playerCache: Map<string, Player> = new Map();
const CACHE_TIMEOUT = 2 * 60 * 1000;
const cacheTimes = new Map<string, number>();

export function getPlayer(userId: string): Player | null {
  const cached = playerCache.get(userId);
  const lastLoad = cacheTimes.get(userId) || 0;
  if (cached && Date.now() - lastLoad < CACHE_TIMEOUT) {
    return cached;
  }

  try {
    const allPlayers = JSON.parse(fs.readFileSync(PLAYERS_DB, 'utf8'));
    const player = allPlayers[userId] || null;
    
    if (player) {
      playerCache.set(userId, player);
      cacheTimes.set(userId, Date.now());
    }
    return player;
  } catch (error) {
    console.error('Erreur load joueur:', error);
    return null;
  }
}