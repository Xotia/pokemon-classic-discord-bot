import fs from 'fs';
import { playersDb } from '../config/paths';

import { Player } from '../types/Player';

export function getPlayer(guildId: string, userId: string): Player | null {
  try {
    const allPlayers = JSON.parse(fs.readFileSync(playersDb(guildId), 'utf8'));
    return allPlayers[userId] || null;
  } catch (error) {
    console.error('Erreur load joueur:', error);
    return null;
  }
}
