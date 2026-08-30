import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { WORLD_BOSS_HISTORY_DB } from '../../config/paths';
import { withFileLock } from '../../utils/fileLock';
import {
  WorldBossHistory,
  WorldBossHistoryEntry,
} from '../../types/worldBoss/WorldBossHistory';

/**
 * Historique global du world boss : source de la difficulté suivante
 * (`lastParticipantsCount`) et du vivier restant (`defeatedBossIds`).
 * Comme l'état, il est mondial : aucune fonction ne prend de `guildId`.
 */

export function createEmptyWorldBossHistory(): WorldBossHistory {
  return {
    lastParticipantsCount: 0,
    lastBossId: null,
    defeatedBossIds: [],
    entries: [],
  };
}

/** Fichier absent ou JSON corrompu : historique vide plutôt que crash. */
export async function loadWorldBossHistory(): Promise<WorldBossHistory> {
  try {
    const raw = await readFile(WORLD_BOSS_HISTORY_DB, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<WorldBossHistory>;

    return {
      ...createEmptyWorldBossHistory(),
      ...parsed,
      lastParticipantsCount: parsed.lastParticipantsCount ?? 0,
      lastBossId: parsed.lastBossId ?? null,
      defeatedBossIds: parsed.defeatedBossIds ?? [],
      entries: parsed.entries ?? [],
    };
  } catch {
    return createEmptyWorldBossHistory();
  }
}

async function saveWorldBossHistory(history: WorldBossHistory): Promise<void> {
  await mkdir(path.dirname(WORLD_BOSS_HISTORY_DB), { recursive: true });
  await writeFile(WORLD_BOSS_HISTORY_DB, JSON.stringify(history, null, 2), 'utf-8');
}

/**
 * Archive une résolution — y compris en défaite et à zéro participant, sinon la
 * difficulté suivante repartirait sur une valeur périmée.
 *
 * `defeatedBossIds` n'est alimenté qu'en cas de victoire, et dans la MÊME
 * écriture verrouillée que l'entrée : une victoire archivée sans retrait ferait
 * revenir un boss annoncé comme définitivement vaincu.
 */
export async function appendWorldBossHistoryEntry(
  entry: WorldBossHistoryEntry,
): Promise<WorldBossHistory> {
  return withFileLock(WORLD_BOSS_HISTORY_DB, async () => {
    const history = await loadWorldBossHistory();

    history.entries.push(entry);
    history.lastParticipantsCount = entry.participantsCount;
    history.lastBossId = entry.bossId;

    if (entry.success && !history.defeatedBossIds.includes(entry.bossId)) {
      history.defeatedBossIds.push(entry.bossId);
    }

    await saveWorldBossHistory(history);
    return history;
  });
}

/** Nombre de participants du world boss précédent, `0` s'il n'y en a pas eu. */
export async function getPreviousParticipantsCount(): Promise<number> {
  const history = await loadWorldBossHistory();
  return history.lastParticipantsCount;
}

/** Ids retirés définitivement du vivier (victoires uniquement). */
export async function getDefeatedBossIds(): Promise<string[]> {
  const history = await loadWorldBossHistory();
  return history.defeatedBossIds;
}
