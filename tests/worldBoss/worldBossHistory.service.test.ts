import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tmp = vi.hoisted(() => {
  const os = require('node:os') as typeof import('node:os');
  const path = require('node:path') as typeof import('node:path');
  const fs = require('node:fs') as typeof import('node:fs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-history-'));
  return { dir, historyFile: path.join(dir, 'world-boss-history.json') };
});

vi.mock('../../src/config/paths', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/config/paths')>()),
  WORLD_BOSS_HISTORY_DB: tmp.historyFile,
}));

import {
  appendWorldBossHistoryEntry,
  createEmptyWorldBossHistory,
  getDefeatedBossIds,
  getPreviousParticipantsCount,
  loadWorldBossHistory,
} from '../../src/features/worldBoss/worldBossHistory.service';
import { WorldBossHistoryEntry } from '../../src/types/worldBoss/WorldBossHistory';

function makeEntry(overrides: Partial<WorldBossHistoryEntry> = {}): WorldBossHistoryEntry {
  return {
    worldBossId: 'wb-2026-08-30',
    bossId: 'wb-001-giratina-origine',
    bossName: 'Giratina (Forme Origine)',
    difficulty: 6,
    participantsCount: 3,
    guildsCount: 2,
    success: true,
    missingStats: [],
    rewardPerPlayer: 900,
    resolvedAt: '2026-08-30T18:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  fs.rmSync(tmp.historyFile, { force: true });
});

afterEach(() => {
  fs.rmSync(tmp.historyFile, { force: true });
});

describe('loadWorldBossHistory', () => {
  it('retourne un historique vide quand le fichier est absent', async () => {
    await expect(loadWorldBossHistory()).resolves.toEqual(createEmptyWorldBossHistory());
    expect(fs.existsSync(tmp.historyFile)).toBe(false);
  });

  it('retourne un historique vide quand le JSON est corrompu plutôt que de crasher', async () => {
    fs.writeFileSync(tmp.historyFile, '{ "entries": [', 'utf-8');

    await expect(loadWorldBossHistory()).resolves.toEqual(createEmptyWorldBossHistory());
  });

  it('complète les champs manquants d’un historique partiel', async () => {
    fs.writeFileSync(tmp.historyFile, JSON.stringify({ lastParticipantsCount: 14 }), 'utf-8');

    const history = await loadWorldBossHistory();

    expect(history.lastParticipantsCount).toBe(14);
    expect(history.lastBossId).toBeNull();
    expect(history.defeatedBossIds).toEqual([]);
    expect(history.entries).toEqual([]);
  });
});

describe('appendWorldBossHistoryEntry', () => {
  it('archive une victoire et retire le boss du vivier', async () => {
    await appendWorldBossHistoryEntry(makeEntry({ participantsCount: 14 }));

    const history = await loadWorldBossHistory();
    expect(history.entries).toHaveLength(1);
    expect(history.lastParticipantsCount).toBe(14);
    expect(history.lastBossId).toBe('wb-001-giratina-origine');
    expect(history.defeatedBossIds).toEqual(['wb-001-giratina-origine']);
  });

  it('archive une défaite sans toucher au vivier', async () => {
    await appendWorldBossHistoryEntry(
      makeEntry({ success: false, missingStats: ['attack'], rewardPerPlayer: 0 }),
    );

    const history = await loadWorldBossHistory();
    expect(history.entries).toHaveLength(1);
    expect(history.lastBossId).toBe('wb-001-giratina-origine');
    expect(history.defeatedBossIds).toEqual([]);
  });

  it('archive un événement sans aucun inscrit, difficulté suivante à zéro participant', async () => {
    await appendWorldBossHistoryEntry(
      makeEntry({ success: false, participantsCount: 0, guildsCount: 0, rewardPerPlayer: 0 }),
    );

    await expect(getPreviousParticipantsCount()).resolves.toBe(0);
    await expect(getDefeatedBossIds()).resolves.toEqual([]);
  });

  it('ne duplique pas un bossId déjà présent dans le vivier vaincu', async () => {
    await appendWorldBossHistoryEntry(makeEntry());
    await appendWorldBossHistoryEntry(makeEntry({ worldBossId: 'wb-2026-09-06' }));

    const history = await loadWorldBossHistory();
    expect(history.entries).toHaveLength(2);
    expect(history.defeatedBossIds).toEqual(['wb-001-giratina-origine']);
  });

  it('ne perd aucune entrée sur des archivages concurrents', async () => {
    const bossIds = Array.from({ length: 10 }, (_, index) => `wb-${index}`);

    await Promise.all(
      bossIds.map((bossId, index) =>
        appendWorldBossHistoryEntry(
          makeEntry({ bossId, worldBossId: `wb-run-${index}`, success: index % 2 === 0 }),
        ),
      ),
    );

    const history = await loadWorldBossHistory();
    expect(history.entries).toHaveLength(10);
    expect(history.entries.map((entry) => entry.bossId).sort()).toEqual([...bossIds].sort());
    expect(history.defeatedBossIds.sort()).toEqual(
      bossIds.filter((_, index) => index % 2 === 0).sort(),
    );
  });
});

describe('lecteurs dénormalisés', () => {
  it('getPreviousParticipantsCount vaut 0 sans historique', async () => {
    await expect(getPreviousParticipantsCount()).resolves.toBe(0);
  });

  it('getDefeatedBossIds reflète les seules victoires archivées', async () => {
    await appendWorldBossHistoryEntry(makeEntry({ bossId: 'wb-a', success: true }));
    await appendWorldBossHistoryEntry(makeEntry({ bossId: 'wb-b', success: false }));

    await expect(getDefeatedBossIds()).resolves.toEqual(['wb-a']);
  });
});
