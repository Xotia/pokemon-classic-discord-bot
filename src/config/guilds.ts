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

type ZoneEntry = { id: string; label: string };
type ZonesByGeneration = Record<string, ZoneEntry[]>;

/**
 * Les fichiers de zones d'un serveur ne sont copiés depuis les defaults qu'à la
 * création. Un serveur créé avant l'ajout d'une génération garde donc des
 * fichiers sans la clé correspondante, et le tirage de raid sur cette
 * génération échoue ("Aucune zone disponible ou à débloquer pour genN").
 * On complète les générations absentes depuis les defaults, sans jamais
 * modifier celles déjà présentes (progression du serveur).
 */
function backfillMissingGenerations(guildFile: string, defaultFile: string): void {
  const guildZones = JSON.parse(fs.readFileSync(guildFile, 'utf-8')) as ZonesByGeneration;
  const defaultZones = JSON.parse(fs.readFileSync(defaultFile, 'utf-8')) as ZonesByGeneration;

  const missing = Object.keys(defaultZones).filter(
    (generationKey) => !Array.isArray(guildZones[generationKey]),
  );

  if (missing.length === 0) return;

  for (const generationKey of missing) {
    guildZones[generationKey] = defaultZones[generationKey];
  }

  fs.writeFileSync(guildFile, JSON.stringify(guildZones, null, 2));
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
  } else {
    backfillMissingGenerations(zonesUnlockedDb(guildId), ZONES_UNLOCKED_DEFAULT);
  }

  if (!fs.existsSync(zonesToUnlockDb(guildId))) {
    fs.copyFileSync(ZONES_TO_UNLOCK_DEFAULT, zonesToUnlockDb(guildId));
  } else {
    backfillMissingGenerations(zonesToUnlockDb(guildId), ZONES_TO_UNLOCK_DEFAULT);
  }

  if (!fs.existsSync(othermonsDb(guildId))) {
    fs.writeFileSync(othermonsDb(guildId), JSON.stringify([], null, 2));
  }
}
