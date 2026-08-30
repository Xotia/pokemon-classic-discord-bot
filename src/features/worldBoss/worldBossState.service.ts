import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { WORLD_BOSS_DB } from '../../config/paths';
import { withFileLock } from '../../utils/fileLock';
import { WorldBossState } from '../../types/worldBoss/WorldBossState';

/**
 * État global du world boss. Aucune fonction ne prend de `guildId` : l'état est
 * mondial, un seul fichier pour tout le parc de serveurs.
 *
 * Toute écriture passe par `withFileLock` sur `WORLD_BOSS_DB` : les
 * inscriptions arrivent de plusieurs serveurs en parallèle, un
 * read-modify-write non protégé perdrait des défenseurs.
 */

export function createEmptyWorldBossState(): WorldBossState {
  return {
    worldBossId: '',
    status: 'idle',
    createdAt: null,
    registrationOpensAt: null,
    registrationClosesAt: null,
    resolvedAt: null,
    boss: null,
    defenders: [],
    result: null,
    reward: null,
  };
}

/**
 * Lit l'état courant. Fichier absent ou JSON corrompu : retour à l'état vide
 * plutôt que crash — un world boss est un événement récurrent, pas une donnée
 * dont la perte doit arrêter le bot.
 */
export async function loadWorldBossState(): Promise<WorldBossState> {
  try {
    const raw = await readFile(WORLD_BOSS_DB, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<WorldBossState>;

    return {
      ...createEmptyWorldBossState(),
      ...parsed,
      defenders: parsed.defenders ?? [],
      boss: parsed.boss ?? null,
      result: parsed.result ?? null,
      reward: parsed.reward ?? null,
    };
  } catch {
    return createEmptyWorldBossState();
  }
}

export async function saveWorldBossState(state: WorldBossState): Promise<void> {
  await mkdir(path.dirname(WORLD_BOSS_DB), { recursive: true });
  await writeFile(WORLD_BOSS_DB, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Read-modify-write sérialisé sur le fichier d'état : le mutateur reçoit l'état
 * courant, le modifie sur place, et ce qu'il retourne est renvoyé à l'appelant
 * (utile pour dire si une inscription a été acceptée ou refusée).
 *
 * Le mutateur ne doit pas ré-acquérir le verrou de `WORLD_BOSS_DB`, ni attendre
 * d'I/O sans rapport : la section critique doit rester étroite.
 */
export async function updateWorldBossState<T>(
  mutate: (state: WorldBossState) => T | Promise<T>,
): Promise<T> {
  return withFileLock(WORLD_BOSS_DB, async () => {
    const state = await loadWorldBossState();
    const outcome = await mutate(state);
    await saveWorldBossState(state);
    return outcome;
  });
}

export async function resetWorldBossState(): Promise<WorldBossState> {
  return withFileLock(WORLD_BOSS_DB, async () => {
    const emptyState = createEmptyWorldBossState();
    await saveWorldBossState(emptyState);
    return emptyState;
  });
}
