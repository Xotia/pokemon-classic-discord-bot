import { readFile } from "node:fs/promises";
import path from "node:path";

import { raidConfig } from "../../config/raid.config.js";
import logger from "../../utils/logger.js";
import { RaidState } from "../../types/raid/RaidState.js";

type ZoneEntry = {
  id: string;
  label: string;
};

type PokemonStats = {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
};

type PokemonEntry = {
  id: number;
  name: string;
  originalName: string;
  rarity: string;
  image: string;
  shinyImage: string;
  types: string[];
  effectiveness: {
    defense: Record<string, number>;
    attack: Record<string, number>;
  };
  stats: PokemonStats;
  zones?: string[];
};

type GenerationKey = "gen1" | "gen2";

type ZonesDb = Record<GenerationKey, ZoneEntry[]>;
type UnlockZonesDb = Record<GenerationKey, ZoneEntry[]>;

const DATA_DIR = path.resolve("data");
const POKEMON_LIST_PATH = path.join(DATA_DIR, "pokemon-list.json");
const ZONES_TO_UNLOCK_PATH = path.join(DATA_DIR, "zones_to_unlock.json");
const ZONES_PATH = path.join(DATA_DIR, "zones_unlocked.json");

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(items: T[]): T {
  if (items.length === 0) {
    throw new Error("Impossible de tirer un élément dans une liste vide.");
  }

  return items[randomInt(0, items.length - 1)];
}

function nowIso(): string {
  return new Date().toISOString();
}

function addHours(date: Date, hours: number): string {
  return new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function parseCronHour(cronExpression: string): number {
  const hourField = cronExpression.trim().split(/\s+/)[1];
  const hour = Number(hourField);
  return Number.isFinite(hour) ? hour : 0;
}

function getRegistrationDurationHours(): number {
  const startHour = parseCronHour(process.env.RAID_START_HOUR || "00 12 * * *");
  const endHour = parseCronHour(process.env.RAID_END_HOUR || "00 20 * * *");
  const diff = endHour - startHour;
  return diff > 0 ? diff : diff + 24;
}

function createRaidId(): string {
  return `raid-${Date.now()}`;
}

function toGenerationKey(generationNumber: number): GenerationKey {
  return `gen${generationNumber}` as GenerationKey;
}

function shouldUseNextZone(): boolean {
  const roll = randomInt(1, 100);
  return roll <= raidConfig.nextZoneChance;
}

function pickRandomAvailableZone(
  generationKey: GenerationKey,
  availableZonesDb: ZonesDb,
): ZoneEntry {
  const currentZones = availableZonesDb[generationKey] ?? [];

  if (currentZones.length === 0) {
    throw new Error(
      `Aucune zone déjà débloquée disponible pour ${generationKey}.`,
    );
  }

  return pickRandom(currentZones);
}

function pickRaidZone(
  generationKey: GenerationKey,
  unlockDb: UnlockZonesDb,
  availableZonesDb: ZonesDb,
): ZoneEntry {
  const currentZones = availableZonesDb[generationKey] ?? [];
  const unlockableZones = unlockDb[generationKey] ?? [];
  const currentZoneIds = new Set(currentZones.map((zone) => zone.id));
  const nextZone = unlockableZones.find((zone) => !currentZoneIds.has(zone.id));

  if (nextZone && shouldUseNextZone()) {
    logger.info(
      {
        generationKey,
        nextZoneChance: raidConfig.nextZoneChance,
        selectedZoneId: nextZone.id,
        selectedZoneType: "next",
      },
      "[RAID] Sélection de la prochaine zone à débloquer",
    );

    return nextZone;
  }

  if (currentZones.length > 0) {
    const selectedZone = pickRandomAvailableZone(
      generationKey,
      availableZonesDb,
    );

    logger.info(
      {
        generationKey,
        nextZoneChance: raidConfig.nextZoneChance,
        selectedZoneId: selectedZone.id,
        selectedZoneType: "available",
      },
      "[RAID] Sélection d’une zone déjà débloquée",
    );

    return selectedZone;
  }

  if (nextZone) {
    logger.info(
      {
        generationKey,
        nextZoneChance: raidConfig.nextZoneChance,
        selectedZoneId: nextZone.id,
        selectedZoneType: "next-fallback",
      },
      "[RAID] Aucune zone débloquée disponible, fallback sur la prochaine zone",
    );

    return nextZone;
  }

  throw new Error(
    `Aucune zone disponible ou à débloquer pour ${generationKey}.`,
  );
}

function getPokemonsForZone(
  zoneId: string,
  pokemonDb: PokemonEntry[],
): PokemonEntry[] {
  return pokemonDb.filter(
    (pokemon) => Array.isArray(pokemon.zones) && pokemon.zones.includes(zoneId),
  );
}

function multiplyStats(stats: PokemonStats, multiplier: number): PokemonStats {
  return {
    hp: stats.hp * multiplier,
    attack: stats.attack * multiplier,
    defense: stats.defense * multiplier,
    specialAttack: stats.specialAttack * multiplier,
    specialDefense: stats.specialDefense * multiplier,
    speed: stats.speed * multiplier,
  };
}

function extractWeaknesses(
  effectiveness: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(effectiveness).filter(([, value]) => value > 1),
  );
}

function extractResistances(
  effectiveness: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(effectiveness).filter(([, value]) => value < 1),
  );
}

export async function generateRaidState(): Promise<RaidState> {
  const pokemonDb = await readJsonFile<PokemonEntry[]>(POKEMON_LIST_PATH);
  const unlockDb = await readJsonFile<UnlockZonesDb>(ZONES_TO_UNLOCK_PATH);
  const availableZonesDb = await readJsonFile<ZonesDb>(ZONES_PATH);

  const generationNumber = randomInt(1, 2);
  const generationKey = toGenerationKey(generationNumber);

  const zone = pickRaidZone(generationKey, unlockDb, availableZonesDb);
  const pokemonsInZone = getPokemonsForZone(zone.id, pokemonDb);

  if (pokemonsInZone.length === 0) {
    throw new Error(`Aucun Pokémon trouvé pour la zone ${zone.id}.`);
  }

  const selectedPokemon = pickRandom(pokemonsInZone);
  const difficulty = randomInt(2, 5);
  const raidAttackType = pickRandom(selectedPokemon.types);
  const finalStats = multiplyStats(selectedPokemon.stats, difficulty);

  const now = new Date();
  const createdAt = nowIso();

  return {
    ...createDefaultRaidState(),
    raidId: createRaidId(),
    status: "registration",
    createdAt,
    registrationOpensAt: createdAt,
    registrationClosesAt: addHours(now, getRegistrationDurationHours()),
    resolvedAt: null,
    generation: generationNumber,
    zone: zone.label,
    raidPokemon: {
      id: selectedPokemon.id,
      name: selectedPokemon.name,
      zone: zone.label,
      types: selectedPokemon.types,
      attackType: raidAttackType,
      difficulty,
      baseStats: selectedPokemon.stats,
      finalStats,
      defenseEffectiveness: selectedPokemon.effectiveness.defense as Record<string, number>,
    },
    defenders: [],
    result: null,
    reward: null,
  };
}

function createDefaultRaidState(): RaidState {
  return {
    raidId: '',
    status: 'idle',
    createdAt: null,
    registrationOpensAt: null,
    registrationClosesAt: null,
    resolvedAt: null,
    generation: null,
    zone: null,
    raidPokemon: null,
    defenders: [],
    result: null,
    reward: null,
  };
}
