import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  getLoggerForGuild: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mocks = vi.hoisted(() => ({ getWorldBossCatalog: vi.fn() }));

vi.mock('../../src/features/worldBoss/worldBossCatalog', () => ({
  getWorldBossCatalog: mocks.getWorldBossCatalog,
}));

const tmp = vi.hoisted(() => {
  const os = require('node:os') as typeof import('node:os');
  const path = require('node:path') as typeof import('node:path');
  const fs = require('node:fs') as typeof import('node:fs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-archive-'));
  return { historyFile: path.join(dir, 'world-boss-history.json') };
});

vi.mock('../../src/config/paths', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/config/paths')>()),
  WORLD_BOSS_HISTORY_DB: tmp.historyFile,
}));

import { archiveWorldBossResult } from '../../src/features/worldBoss/archiveWorldBossResult';
import { loadWorldBossHistory } from '../../src/features/worldBoss/worldBossHistory.service';
import { createEmptyWorldBossState } from '../../src/features/worldBoss/worldBossState.service';
import logger from '../../src/utils/logger';
import { WorldBossReward } from '../../src/types/worldBoss/WorldBossReward';
import { WorldBossState } from '../../src/types/worldBoss/WorldBossState';

const STATS = { hp: 150, attack: 120, defense: 100, specialAttack: 120, specialDefense: 100, speed: 90 };

function catalogEntry(id: string) {
  return {
    id,
    name: `Boss ${id}`,
    portal: 'Faille',
    sprite: '',
    types: ['ghost'],
    attackType: 'ghost',
    stats: STATS,
    defenseEffectiveness: {},
    lore: '',
  };
}

function resolvedState(success: boolean, participantsCount: number): WorldBossState {
  return {
    ...createEmptyWorldBossState(),
    worldBossId: 'world-boss-1',
    status: 'resolved',
    resolvedAt: '2026-08-30T18:00:00.000Z',
    boss: {
      id: 'wb-a',
      name: 'Giratina',
      portal: 'Faille',
      sprite: '',
      types: ['ghost'],
      attackType: 'ghost',
      difficulty: 6,
      baseStats: STATS,
      finalStats: STATS,
      defenseEffectiveness: {},
      lore: '',
    },
    result: {
      success,
      missingStats: success ? [] : ['attack'],
      participantsCount,
      guildsCount: participantsCount > 0 ? 2 : 0,
      teamStats: STATS,
      statDiffs: STATS,
    },
  };
}

const REWARD: WorldBossReward = { rewardPerPlayer: 900, worldBossWin: true, rewardedUserIds: ['u1'] };
const NO_REWARD: WorldBossReward = { rewardPerPlayer: 0, worldBossWin: false, rewardedUserIds: [] };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getWorldBossCatalog.mockReturnValue([catalogEntry('wb-a'), catalogEntry('wb-b')]);
  fs.rmSync(tmp.historyFile, { force: true });
});

afterEach(() => {
  fs.rmSync(tmp.historyFile, { force: true });
});

describe('archiveWorldBossResult', () => {
  it('archive une victoire et retire le boss du vivier dans la même écriture', async () => {
    const entry = await archiveWorldBossResult(resolvedState(true, 3), REWARD);

    expect(entry).toMatchObject({
      bossId: 'wb-a',
      bossName: 'Giratina',
      difficulty: 6,
      participantsCount: 3,
      guildsCount: 2,
      success: true,
      rewardPerPlayer: 900,
      resolvedAt: '2026-08-30T18:00:00.000Z',
    });

    const history = await loadWorldBossHistory();
    expect(history.entries).toHaveLength(1);
    expect(history.lastParticipantsCount).toBe(3);
    expect(history.defeatedBossIds).toEqual(['wb-a']);
  });

  it('journalise le retrait définitif avec le nombre de boss restants', async () => {
    await archiveWorldBossResult(resolvedState(true, 3), REWARD);

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'world_boss_defeated_permanently', remainingBosses: 1 }),
      expect.any(String),
    );
  });

  it('signale le vivier épuisé quand le retrait vide la liste', async () => {
    mocks.getWorldBossCatalog.mockReturnValue([catalogEntry('wb-a')]);

    await archiveWorldBossResult(resolvedState(true, 3), REWARD);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'world_boss_pool_exhausted' }),
      expect.any(String),
    );
  });

  it('archive une défaite sans toucher au vivier', async () => {
    await archiveWorldBossResult(resolvedState(false, 4), NO_REWARD);

    const history = await loadWorldBossHistory();
    expect(history.entries).toHaveLength(1);
    expect(history.lastParticipantsCount).toBe(4);
    expect(history.defeatedBossIds).toEqual([]);
    expect(logger.info).not.toHaveBeenCalledWith(
      expect.objectContaining({ event: 'world_boss_defeated_permanently' }),
      expect.any(String),
    );
  });

  it('archive un événement sans aucun inscrit, pour ramener la difficulté suivante à 6', async () => {
    await archiveWorldBossResult(resolvedState(false, 0), NO_REWARD);

    const history = await loadWorldBossHistory();
    expect(history.entries).toHaveLength(1);
    expect(history.lastParticipantsCount).toBe(0);
    expect(history.lastBossId).toBe('wb-a');
  });

  it('refuse d’archiver un état non résolu', async () => {
    await expect(
      archiveWorldBossResult(createEmptyWorldBossState(), NO_REWARD),
    ).rejects.toThrow('WORLD_BOSS_NOT_RESOLVED');
  });
});
