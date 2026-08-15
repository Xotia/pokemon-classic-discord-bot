import { readFile } from "node:fs/promises";

import { getLoggerForGuild } from "../../utils/logger";
import { RaidState } from "../../types/raid/RaidState";
import { zonesUnlockedDb, zonesToUnlockDb } from "../../config/paths";
import { getRaidNextZoneChance, getRaidStartHour, getRaidEndHour, getGenerationNumber } from "../../config/guildSettings";
import { getPokemonCatalog } from "../../utils/pokemonCatalog";

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

type GenerationKey = "gen1" | "gen2" | "gen3";

type ZonesDb = Record<GenerationKey, ZoneEntry[]>;
type UnlockZonesDb = Record<GenerationKey, ZoneEntry[]>;

/**
 * Ce qu'une génération peut proposer à un instant T : les zones déjà
 * débloquées (raid classique) et la prochaine zone à débloquer (raid
 * "nouvelle zone"), `null` quand la génération est épuisée.
 */
type GenerationAvailability = {
  generationNumber: number;
  generationKey: GenerationKey;
  unlockedZones: ZoneEntry[];
  nextZone: ZoneEntry | null;
};

export type RaidGenerationOptions = {
  /** Force la génération du raid (1..GENERATION_NUMBER). Sinon tirage aléatoire. */
  generation?: number;
  /** Force le type de zone : true = prochaine zone à débloquer, false = zone déjà débloquée. Sinon tirage sur RAID_NEXT_ZONE_CHANCE. */
  newZone?: boolean;
};

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

function addMinutes(date: Date, minutes: number): string {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
}

function parseCronMinuteHour(cronExpression: string): { hour: number; minute: number } {
  const [minuteField, hourField] = cronExpression.trim().split(/\s+/);
  const minute = Number(minuteField);
  const hour = Number(hourField);
  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

function getRegistrationDurationMinutes(guildId: string): number {
  const start = parseCronMinuteHour(getRaidStartHour(guildId));
  const end = parseCronMinuteHour(getRaidEndHour(guildId));
  const diff = end.hour * 60 + end.minute - (start.hour * 60 + start.minute);
  return diff > 0 ? diff : diff + 24 * 60;
}

function createRaidId(): string {
  return `raid-${Date.now()}`;
}

function toGenerationKey(generationNumber: number): GenerationKey {
  return `gen${generationNumber}` as GenerationKey;
}

function shouldUseNextZone(guildId: string): boolean {
  const roll = randomInt(1, 100);
  return roll <= getRaidNextZoneChance(guildId);
}

/**
 * Photographie l'état de chaque génération sous le plafond configuré.
 * C'est cette photo qui pilote le tirage : une génération épuisée (plus
 * aucune zone à débloquer) sort d'elle-même du pool "nouvelle zone", sans
 * relance ni cas particulier par génération.
 */
function collectGenerationAvailability(
  maxGeneration: number,
  unlockDb: UnlockZonesDb,
  availableZonesDb: ZonesDb,
): GenerationAvailability[] {
  const availability: GenerationAvailability[] = [];

  for (let generationNumber = 1; generationNumber <= maxGeneration; generationNumber++) {
    const generationKey = toGenerationKey(generationNumber);
    const unlockedZones = availableZonesDb[generationKey] ?? [];
    const unlockedIds = new Set(unlockedZones.map((zone) => zone.id));
    const nextZone =
      (unlockDb[generationKey] ?? []).find((zone) => !unlockedIds.has(zone.id)) ?? null;

    availability.push({ generationNumber, generationKey, unlockedZones, nextZone });
  }

  return availability;
}

function describeGenerations(candidates: GenerationAvailability[]): string {
  return candidates.map((candidate) => candidate.generationKey).join(", ");
}

/**
 * Décide en un seul endroit la génération ET le type de zone du raid.
 *
 * L'ordre est volontairement inversé par rapport à l'ancien code : on tire
 * d'abord le TYPE de raid (nouvelle zone ou zone connue), puis la génération
 * parmi celles qui peuvent réellement l'honorer. Tirer la génération d'abord
 * revenait à gaspiller le tirage "nouvelle zone" chaque fois qu'il tombait sur
 * une génération épuisée (gen2 aujourd'hui), et l'effet s'aggrave à chaque
 * génération terminée. Aucune relance n'est nécessaire, donc pas de boucle
 * potentiellement infinie quand toutes les générations sont épuisées.
 */
function selectGenerationAndZone(
  guildId: string,
  availability: GenerationAvailability[],
  options: RaidGenerationOptions,
): { generation: GenerationAvailability; zone: ZoneEntry; zoneType: "next" | "available" } {
  const logger = getLoggerForGuild(guildId);
  const nextZoneChance = getRaidNextZoneChance(guildId);

  const pool =
    options.generation !== undefined
      ? availability.filter((candidate) => candidate.generationNumber === options.generation)
      : availability;

  const withNextZone = pool.filter((candidate) => candidate.nextZone !== null);
  const withUnlockedZone = pool.filter((candidate) => candidate.unlockedZones.length > 0);

  // Demande explicite (commande admin) : on n'improvise pas, on échoue clairement.
  if (options.newZone === true && withNextZone.length === 0) {
    throw new Error(
      options.generation !== undefined
        ? `Aucune nouvelle zone à débloquer pour gen${options.generation} : toutes ses zones sont déjà débloquées.`
        : "Aucune nouvelle zone à débloquer, toutes les générations ouvertes sont épuisées.",
    );
  }

  if (options.newZone === false && withUnlockedZone.length === 0) {
    throw new Error(
      options.generation !== undefined
        ? `Aucune zone déjà débloquée pour gen${options.generation}.`
        : "Aucune zone déjà débloquée sur les générations ouvertes.",
    );
  }

  const wantsNewZone = options.newZone ?? shouldUseNextZone(guildId);

  if (wantsNewZone && withNextZone.length > 0) {
    const generation = pickRandom(withNextZone);
    const zone = generation.nextZone as ZoneEntry;

    logger.info(
      {
        generationKey: generation.generationKey,
        nextZoneChance,
        forcedGeneration: options.generation ?? null,
        forcedZoneType: options.newZone ?? null,
        eligibleGenerations: describeGenerations(withNextZone),
        selectedZoneId: zone.id,
        selectedZoneType: "next",
      },
      "[RAID] Sélection de la prochaine zone à débloquer",
    );

    return { generation, zone, zoneType: "next" };
  }

  if (withUnlockedZone.length > 0) {
    const generation = pickRandom(withUnlockedZone);
    const zone = pickRandom(generation.unlockedZones);

    logger.info(
      {
        generationKey: generation.generationKey,
        nextZoneChance,
        forcedGeneration: options.generation ?? null,
        forcedZoneType: options.newZone ?? null,
        eligibleGenerations: describeGenerations(withUnlockedZone),
        degradedFromNextZone: wantsNewZone,
        selectedZoneId: zone.id,
        selectedZoneType: "available",
      },
      wantsNewZone
        ? "[RAID] Plus aucune nouvelle zone disponible, repli sur une zone déjà débloquée"
        : "[RAID] Sélection d’une zone déjà débloquée",
    );

    return { generation, zone, zoneType: "available" };
  }

  // Aucune zone débloquée nulle part (démarrage d'un serveur) : on ouvre sur la
  // première zone à débloquer, comme avant.
  if (withNextZone.length > 0) {
    const generation = pickRandom(withNextZone);
    const zone = generation.nextZone as ZoneEntry;

    logger.info(
      {
        generationKey: generation.generationKey,
        nextZoneChance,
        forcedGeneration: options.generation ?? null,
        selectedZoneId: zone.id,
        selectedZoneType: "next-fallback",
      },
      "[RAID] Aucune zone débloquée disponible, fallback sur la prochaine zone",
    );

    return { generation, zone, zoneType: "next" };
  }

  throw new Error(
    options.generation !== undefined
      ? `Aucune zone disponible ou à débloquer pour gen${options.generation}.`
      : "Aucune zone disponible ou à débloquer sur les générations ouvertes.",
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

export function multiplyStats(stats: PokemonStats, multiplier: number): PokemonStats {
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

/**
 * options n'est renseigné que par les outils d'exploitation (scripts/raid-tools,
 * commande admin /raid-force-start) pour rejouer un raid sur une génération ou
 * un type de zone précis. Le scheduler l'omet et garde le tirage aléatoire.
 */
export async function generateRaidState(
  guildId: string,
  options: RaidGenerationOptions = {},
): Promise<RaidState> {
  const pokemonDb = getPokemonCatalog(guildId) as unknown as PokemonEntry[];
  const unlockDb = await readJsonFile<UnlockZonesDb>(zonesToUnlockDb(guildId));
  const availableZonesDb = await readJsonFile<ZonesDb>(zonesUnlockedDb(guildId));

  const maxGeneration = getGenerationNumber(guildId);

  if (options.generation !== undefined) {
    if (!Number.isInteger(options.generation) || options.generation < 1 || options.generation > maxGeneration) {
      throw new Error(
        `Génération forcée invalide : ${options.generation} (attendu un entier entre 1 et ${maxGeneration} pour guildId=${guildId}).`,
      );
    }
  }

  const availability = collectGenerationAvailability(maxGeneration, unlockDb, availableZonesDb);
  const { generation, zone } = selectGenerationAndZone(guildId, availability, options);
  const generationNumber = generation.generationNumber;

  const allPokemonsInZone = getPokemonsForZone(zone.id, pokemonDb);
  const pokemonsInZone = allPokemonsInZone.filter(
    (p) => p.rarity !== 'legendary' && p.rarity !== 'legendary_wandering',
  );

  if (pokemonsInZone.length === 0) {
    throw new Error(`Aucun Pokémon non-légendaire trouvé pour la zone ${zone.id}.`);
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
    registrationClosesAt: addMinutes(now, getRegistrationDurationMinutes(guildId)),
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
