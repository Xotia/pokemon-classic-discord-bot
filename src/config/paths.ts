import path from 'path';

export const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
export const POKEMON_DB = path.join(DATA_DIR, 'pokemon-list.json');
export const POKEMON_GEN1_DB = path.join(DATA_DIR, 'pokemon-gen1.json');
export const POKEMON_GEN2_DB = path.join(DATA_DIR, 'pokemon-gen2.json');

export const GUILDS_ROOT = path.join(DATA_DIR, 'guilds');
export const GUILDS_REGISTRY = path.join(DATA_DIR, 'guilds.json');
export const ZONES_UNLOCKED_DEFAULT = path.join(DATA_DIR, 'zones_unlocked.default.json');
export const ZONES_TO_UNLOCK_DEFAULT = path.join(DATA_DIR, 'zones_to_unlock.default.json');

export function guildDir(guildId: string): string {
  return path.join(GUILDS_ROOT, guildId);
}

export function playersDb(guildId: string): string {
  return path.join(guildDir(guildId), 'players.json');
}

export function statsDb(guildId: string): string {
  return path.join(guildDir(guildId), 'stats.json');
}

export function zonesUnlockedDb(guildId: string): string {
  return path.join(guildDir(guildId), 'zones_unlocked.json');
}

export function zonesToUnlockDb(guildId: string): string {
  return path.join(guildDir(guildId), 'zones_to_unlock.json');
}

export function raidStateDb(guildId: string): string {
  return path.join(guildDir(guildId), 'raid.json');
}