#!/usr/bin/env tsx

import fs from 'fs/promises';
import path from 'path';
import { Player } from '../types/Player';

const PLAYERS_FILE = path.join(process.cwd(), '../../data/players.json');

async function addPityCounter() {
  try {
    const data = await fs.readFile(PLAYERS_FILE, 'utf8');
    const players: Record<string, Player> = JSON.parse(data);
    
    console.log(`📥 ${Object.keys(players).length} joueurs trouvés`);
    
    let updated = 0;
    
    for (const [playerId, player] of Object.entries(players)) {
      if (!player.hasOwnProperty('pityCounter')) {
        player.pityCounter = 0;
        updated++;
      }
    }
    
    await fs.writeFile(PLAYERS_FILE, JSON.stringify(players, null, 2), 'utf8');
    
    console.log(`✅ ${updated} joueurs mis à jour`);
    console.log(`💾 players.json sauvegardé`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

addPityCounter();