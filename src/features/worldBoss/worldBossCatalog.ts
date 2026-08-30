import fs from 'node:fs';
import { WORLD_BOSS_LIST_DB } from '../../config/paths';
import { TYPE_LABELS } from '../../config/typeLabels';
import { WorldBossEntry } from '../../types/worldBoss/WorldBossEntry';
import { WorldBossStats } from '../../types/worldBoss/WorldBossStats';

const STAT_KEYS: (keyof WorldBossStats)[] = [
  'hp',
  'attack',
  'defense',
  'specialAttack',
  'specialDefense',
  'speed',
];

// Multiplicateurs d'efficacité atteignables en croisant deux types.
const ALLOWED_EFFECTIVENESS = [0, 0.25, 0.5, 1, 2, 4];

let catalogCache: WorldBossEntry[] | null = null;

class WorldBossListError extends Error {
  constructor(message: string) {
    super(`data/world-boss-list.json : ${message}`);
    this.name = 'WorldBossListError';
  }
}

function fail(bossRef: string, rule: string): never {
  throw new WorldBossListError(`${bossRef} — ${rule}`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateEntry(raw: unknown, index: number, seenIds: Set<string>): WorldBossEntry {
  const position = `entrée #${index}`;
  if (!isPlainObject(raw)) fail(position, "l'entrée doit être un objet");

  const id = raw.id;
  if (typeof id !== 'string' || id.trim() === '') {
    fail(position, 'le champ "id" est obligatoire et non vide');
  }
  const ref = `boss "${id}"`;
  if (seenIds.has(id)) fail(ref, 'id dupliqué dans la liste');
  seenIds.add(id);

  for (const field of ['name', 'portal', 'sprite', 'lore'] as const) {
    const value = raw[field];
    if (typeof value !== 'string' || value.trim() === '') {
      fail(ref, `le champ "${field}" est obligatoire et non vide`);
    }
  }

  const types = raw.types;
  if (!Array.isArray(types) || types.length === 0) {
    fail(ref, 'le champ "types" doit contenir au moins un type');
  }
  for (const type of types) {
    if (typeof type !== 'string' || !(type in TYPE_LABELS)) {
      fail(ref, `type inconnu dans "types" : ${String(type)}`);
    }
  }

  const attackType = raw.attackType;
  if (typeof attackType !== 'string' || !types.includes(attackType)) {
    fail(ref, `"attackType" (${String(attackType)}) doit appartenir à "types"`);
  }

  const stats = raw.stats;
  if (!isPlainObject(stats)) fail(ref, 'le champ "stats" est obligatoire');
  for (const key of STAT_KEYS) {
    const value = (stats as Record<string, unknown>)[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      fail(ref, `statistique manquante ou non numérique : "${key}"`);
    }
    if (value <= 0) {
      fail(ref, `statistique "${key}" doit être strictement positive (reçu ${value})`);
    }
  }

  const defenseEffectiveness = raw.defenseEffectiveness;
  if (!isPlainObject(defenseEffectiveness)) {
    fail(ref, 'le champ "defenseEffectiveness" est obligatoire (objet, éventuellement vide)');
  }
  for (const [type, multiplier] of Object.entries(defenseEffectiveness)) {
    if (!(type in TYPE_LABELS)) {
      fail(ref, `type inconnu dans "defenseEffectiveness" : ${type}`);
    }
    if (typeof multiplier !== 'number' || !ALLOWED_EFFECTIVENESS.includes(multiplier)) {
      fail(
        ref,
        `multiplicateur invalide pour "${type}" : ${String(multiplier)} (attendu ${ALLOWED_EFFECTIVENESS.join(', ')})`,
      );
    }
  }

  return raw as unknown as WorldBossEntry;
}

/**
 * Valide une liste de world boss déjà désérialisée. Lève une erreur nommant
 * l'id fautif et la règle violée dès la première entrée invalide.
 */
export function parseWorldBossList(raw: unknown): WorldBossEntry[] {
  if (!isPlainObject(raw)) throw new WorldBossListError('le fichier doit contenir un objet racine');

  const bosses = raw.bosses;
  if (!Array.isArray(bosses)) throw new WorldBossListError('le champ "bosses" doit être un tableau');
  if (bosses.length === 0) throw new WorldBossListError('la liste "bosses" est vide');

  const seenIds = new Set<string>();
  return bosses.map((entry, index) => validateEntry(entry, index, seenIds));
}

/** Lit et valide la liste depuis le disque, sans passer par le cache. */
export function loadWorldBossList(filePath: string = WORLD_BOSS_LIST_DB): WorldBossEntry[] {
  if (!fs.existsSync(filePath)) {
    throw new WorldBossListError(`fichier introuvable : ${filePath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    throw new WorldBossListError(`JSON illisible (${(error as Error).message})`);
  }

  return parseWorldBossList(parsed);
}

/** Liste des world boss, mise en cache après la première lecture. */
export function getWorldBossCatalog(): WorldBossEntry[] {
  if (!catalogCache) catalogCache = loadWorldBossList();
  return catalogCache;
}

export function getWorldBossEntry(id: string): WorldBossEntry | null {
  return getWorldBossCatalog().find((boss) => boss.id === id) ?? null;
}

/** Recherche par nom affiché (« Florizarre Gigamax »), insensible à la casse. */
export function getWorldBossEntryByName(name: string): WorldBossEntry | null {
  const normalized = name.trim().toLowerCase();
  return getWorldBossCatalog().find((boss) => boss.name.trim().toLowerCase() === normalized) ?? null;
}

export function clearWorldBossCatalogCache(): void {
  catalogCache = null;
}
