import path from 'path';

export const DATA_DIR = path.resolve('data');
export const POKEMON_DB = path.join(DATA_DIR, 'pokemon-list.json');
export const PLAYERS_DB = path.join(DATA_DIR, 'players.json');
export const STATS_DB = path.join(DATA_DIR, 'stats.json');
export const POKEMON_GEN2_DB = path.join(DATA_DIR, 'pokemon-gen2.json')