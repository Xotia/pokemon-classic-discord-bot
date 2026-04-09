#!/usr/bin/env tsx
import fs from 'fs/promises';
import { getPokemonName } from '../methods/pokemon/getPokemonName.js';
import { PLAYERS_DB } from '../config/paths.js';
import { STATS_DB } from '../config/paths.js';

// Chemins

interface PlayerData {
  name: string;
  randomCaptures: Record<string, { total: number; shiny: number }>;
}

interface PlayersFile {
  [discordId: string]: PlayerData;
}

interface PokemonStats {
  random: {
    pokemonPerPlayer: Record<string, Record<string, number>>;
  };
}

async function syncPlayersFromStats() {
  console.log('🔄 Synchronisation players.json avec stats...');

  const playersRaw = await fs.readFile(PLAYERS_DB, 'utf-8');
  const players: PlayersFile = JSON.parse(playersRaw);

  const statsRaw = await fs.readFile(STATS_DB, 'utf-8');
  const stats: PokemonStats = JSON.parse(statsRaw);

  let updatedCount = 0;

  for (const [discordId, player] of Object.entries(players)) {
    const playerName = player.name;
    
    if (stats.random.pokemonPerPlayer[playerName]) {
      const playerStats = stats.random.pokemonPerPlayer[playerName];
      
      for (const [pokemonIdStr, captureData] of Object.entries(player.randomCaptures)) {
        const pokemonId = parseInt(pokemonIdStr);
        
        // ✅ Await + check null
        const pokemonName = await getPokemonName(pokemonId);
        if (pokemonName && playerStats[pokemonName]) {
          captureData.total = playerStats[pokemonName];
          captureData.shiny = 0;
          updatedCount++;
        }
      }
    }
  }

  await fs.writeFile(PLAYERS_DB, JSON.stringify(players, null, 2), 'utf-8');
  console.log(`✅ ${updatedCount} captures mises à jour !`);
}

syncPlayersFromStats().catch(console.error);