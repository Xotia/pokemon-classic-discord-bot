import { promises as fs } from 'fs';

import { STATS_DB } from '../config/paths';

export interface PokemonStats {
    totalCaptures: number;
    totalShinyCaptures?: number;

    random?: {
        totalShinyCaptures: number;
        pokemonsTotals: Record<string, number>;
        shinyCaptures: Record<string, number>;
    };

    playerTotals: Record<string, number>;
    pokemonPerPlayer: Record<string, Record<string, number>>;
    shinyCaptures: Record<string, number>;
    pokemonsTotals: Record<string, number>;
}

export async function loadPokemonStats(): Promise<PokemonStats> {
  
  try {
    const raw = await fs.readFile(STATS_DB, 'utf-8');
    const fileData = JSON.parse(raw);
    
    return {
      totalCaptures: fileData.totalCaptures || fileData.totalCaptures || 0,
      totalShinyCaptures: fileData.totalShinyCaptures || 0,
      playerTotals: fileData.playerTotals || fileData.playerTotals || {},
      pokemonPerPlayer: fileData.pokemonPerPlayer || fileData.pokemonPerPlayer || {},
      shinyCaptures: fileData.shinyCaptures || fileData.shinyCaptures || {},
      pokemonsTotals: fileData.pokemonsTotals || fileData.pokemonsTotals || {}
    };
  } catch (error) {
    console.error('Erreur stats:', error);
    return defaultEmptyStats();
  }
}

function defaultEmptyStats(): PokemonStats {
  return {
    totalCaptures: 0,
    totalShinyCaptures: 0,
    playerTotals: {},
    pokemonPerPlayer: {},
    shinyCaptures: {},
    pokemonsTotals: {}
  };
}