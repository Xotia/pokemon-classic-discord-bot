import fs from 'fs';
import { playersDb } from '../config/paths';

import { Player } from '../types/Player';

const playerCache: Map<string, Player> = new Map();
const CACHE_TIMEOUT = 2 * 60 * 1000;
const cacheTimes = new Map<string, number>();

export function getPlayer(guildId: string, userId: string): Player | null {
  const cacheKey = `${guildId}:${userId}`;
  const cached = playerCache.get(cacheKey);
  const lastLoad = cacheTimes.get(cacheKey) || 0;
  if (cached && Date.now() - lastLoad < CACHE_TIMEOUT) {
    return cached;
  }

  try {
    const allPlayers = JSON.parse(fs.readFileSync(playersDb(guildId), 'utf8'));
    const player = allPlayers[userId] || null;

    if (player) {
      playerCache.set(cacheKey, player);
      cacheTimes.set(cacheKey, Date.now());
    }
    return player;
  } catch (error) {
    console.error('Erreur load joueur:', error);
    return null;
  }
}