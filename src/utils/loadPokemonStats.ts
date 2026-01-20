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
      totalCaptures: fileData.random?.totalCaptures || fileData.totalCaptures || 0,
      totalShinyCaptures: fileData.random?.totalShinyCaptures || 0,
      playerTotals: fileData.random?.playerTotals || fileData.playerTotals || {},
      pokemonPerPlayer: fileData.random?.pokemonPerPlayer || fileData.pokemonPerPlayer || {},
      shinyCaptures: fileData.random?.shinyCaptures || fileData.shinyCaptures || {},
      pokemonsTotals: fileData.random?.pokemonsTotals || fileData.pokemonsTotals || {}
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