import fs from 'node:fs';
import { GuildRegistryEntry } from '../types/GuildRegistryEntry';
import {
  GUILDS_REGISTRY,
  guildDir,
  playersDb,
  statsDb,
  zonesUnlockedDb,
  zonesToUnlockDb,
  othermonsDb,
  ZONES_UNLOCKED_DEFAULT,
  ZONES_TO_UNLOCK_DEFAULT,
} from './paths';

const EMPTY_STATS = { totalCaptures: 0, totalShinyCaptures: 0, playerTotals: {}, pokemonsTotals: {}, rarity: {} };

let cachedRegistry: GuildRegistryEntry[] | null = null;

export function loadGuildRegistry(): GuildRegistryEntry[] {
  if (cachedRegistry) return cachedRegistry;

  if (!fs.existsSync(GUILDS_REGISTRY)) {
    throw new Error(`Registre des serveurs introuvable : ${GUILDS_REGISTRY}`);
  }

  const raw = fs.readFileSync(GUILDS_REGISTRY, 'utf-8');
  const parsed = JSON.parse(raw) as { guilds: GuildRegistryEntry[] };

  parsed.guilds.forEach((entry) => {
    if (!entry.guildId || !entry.raidAnnounceChannelId || !entry.mainChannelId) {
      throw new Error(
        `Entrée invalide dans ${GUILDS_REGISTRY} : guildId, raidAnnounceChannelId et mainChannelId sont requis (guildId=${entry.guildId})`,
      );
    }
  });

  cachedRegistry = parsed.guilds;
  return cachedRegistry;
}

export function getGuildConfig(guildId: string): GuildRegistryEntry | undefined {
  return loadGuildRegistry().find((entry) => entry.guildId === guildId);
}

export function ensureGuildDataFiles(guildId: string): void {
  fs.mkdirSync(guildDir(guildId), { recursive: true });

  if (!fs.existsSync(playersDb(guildId))) {
    fs.writeFileSync(playersDb(guildId), JSON.stringify({}, null, 2));
  }

  if (!fs.existsSync(statsDb(guildId))) {
    fs.writeFileSync(statsDb(guildId), JSON.stringify(EMPTY_STATS, null, 2));
  }

  if (!fs.existsSync(zonesUnlockedDb(guildId))) {
    fs.copyFileSync(ZONES_UNLOCKED_DEFAULT, zonesUnlockedDb(guildId));
  }

  if (!fs.existsSync(zonesToUnlockDb(guildId))) {
    fs.copyFileSync(ZONES_TO_UNLOCK_DEFAULT, zonesToUnlockDb(guildId));
  }

  if (!fs.existsSync(othermonsDb(guildId))) {
    fs.writeFileSync(othermonsDb(guildId), JSON.stringify([], null, 2));
  }
}
