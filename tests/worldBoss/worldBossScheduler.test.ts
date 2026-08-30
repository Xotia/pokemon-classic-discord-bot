import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  getLoggerForGuild: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mocks = vi.hoisted(() => ({
  schedule: vi.fn(),
  getWorldBossCatalog: vi.fn(),
  loadGuildRegistry: vi.fn(),
  broadcastWorldBossEmbed: vi.fn(async () => ({ sent: 1, failed: 0, failures: [] })),
  applyWorldBossRewards: vi.fn(),
  calls: [] as string[],
}));

vi.mock('node-cron', () => ({ default: { schedule: mocks.schedule } }));

vi.mock('../../src/features/worldBoss/worldBossCatalog', () => ({
  getWorldBossCatalog: mocks.getWorldBossCatalog,
}));

vi.mock('../../src/config/guilds', () => ({ loadGuildRegistry: mocks.loadGuildRegistry }));

vi.mock('../../src/features/worldBoss/broadcastWorldBossEmbed', () => ({
  broadcastWorldBossEmbed: async (...args: unknown[]) => {
    mocks.calls.push('broadcast');
    return mocks.broadcastWorldBossEmbed(...(args as []));
  },
}));

vi.mock('../../src/features/worldBoss/applyWorldBossRewards', () => ({
  applyWorldBossRewards: async (...args: unknown[]) => {
    mocks.calls.push('rewards');
    return mocks.applyWorldBossRewards(...(args as []));
  },
}));

const tmp = vi.hoisted(() => {
  const os = require('node:os') as typeof import('node:os');
  const path = require('node:path') as typeof import('node:path');
  const fs = require('node:fs') as typeof import('node:fs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-scheduler-'));
  return {
    stateFile: path.join(dir, 'world-boss.json'),
    historyFile: path.join(dir, 'world-boss-history.json'),
  };
});

vi.mock('../../src/config/paths', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/config/paths')>()),
  WORLD_BOSS_DB: tmp.stateFile,
  WORLD_BOSS_HISTORY_DB: tmp.historyFile,
}));

import {
  closeWorldBossAndResolve,
  openWorldBoss,
  startWorldBossScheduler,
} from '../../src/features/worldBoss/worldBossScheduler';
import { loadWorldBossHistory } from '../../src/features/worldBoss/worldBossHistory.service';
import { loadWorldBossState, saveWorldBossState } from '../../src/features/worldBoss/worldBossState.service';
import { WorldBossDefender } from '../../src/types/worldBoss/WorldBossDefender';

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
    lore: 'Contexte.',
  };
}

function makeDefender(userId: string, guildId: string): WorldBossDefender {
  return {
    userId,
    guildId,
    guildName: `Serveur ${guildId}`,
    displayName: `Joueur ${userId}`,
    pokemonId: 95,
    pokemonName: 'Onix',
    attackType: 'ground',
    registeredAt: '2026-08-30T11:00:00.000Z',
    snapshot: { types: ['rock'], defenseEffectiveness: {}, stats: STATS },
  };
}

const fakeClient = {} as never;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  mocks.getWorldBossCatalog.mockReturnValue([catalogEntry('wb-a'), catalogEntry('wb-b')]);
  mocks.loadGuildRegistry.mockReturnValue([]);
  mocks.applyWorldBossRewards.mockResolvedValue({
    rewardPerPlayer: 900,
    worldBossWin: true,
    rewardedUserIds: ['u1'],
  });
  fs.rmSync(tmp.stateFile, { force: true });
  fs.rmSync(tmp.historyFile, { force: true });
});

afterEach(() => {
  fs.rmSync(tmp.stateFile, { force: true });
  fs.rmSync(tmp.historyFile, { force: true });
});

describe('startWorldBossScheduler', () => {
  it('enregistre exactement deux crons, quel que soit le nombre de serveurs', () => {
    mocks.loadGuildRegistry.mockReturnValue(
      Array.from({ length: 5 }, (_, index) => ({
        guildId: `g${index}`,
        name: `Serveur ${index}`,
        raidAnnounceChannelId: `c${index}`,
        mainChannelId: 'main',
      })),
    );

    startWorldBossScheduler(fakeClient);

    expect(mocks.schedule).toHaveBeenCalledTimes(2);
    // L'événement est mondial : le registre n'a rien à voir avec le nombre de crons.
    expect(mocks.loadGuildRegistry).not.toHaveBeenCalled();
  });

  it('planifie sur le fuseau Europe/Paris', () => {
    startWorldBossScheduler(fakeClient);

    for (const call of mocks.schedule.mock.calls) {
      expect(call[2]).toEqual({ timezone: 'Europe/Paris' });
    }
  });
});

describe('openWorldBoss', () => {
  it('ouvre un world boss, le persiste et diffuse l’annonce', async () => {
    const state = await openWorldBoss(fakeClient);

    expect(state?.status).toBe('registration');
    expect(mocks.calls).toEqual(['broadcast']);
    await expect(loadWorldBossState()).resolves.toMatchObject({ status: 'registration' });
  });

  it('est idempotente : une seconde ouverture ne touche à rien', async () => {
    const first = await openWorldBoss(fakeClient);
    mocks.calls.length = 0;

    const second = await openWorldBoss(fakeClient);

    expect(second).toBeNull();
    expect(mocks.calls).toEqual([]);
    await expect(loadWorldBossState()).resolves.toMatchObject({
      worldBossId: first!.worldBossId,
    });
  });

  it('laisse l’état à idle sans lever quand le vivier est épuisé', async () => {
    fs.writeFileSync(
      tmp.historyFile,
      JSON.stringify({
        lastParticipantsCount: 0,
        lastBossId: 'wb-b',
        defeatedBossIds: ['wb-a', 'wb-b'],
        entries: [],
      }),
      'utf-8',
    );

    await expect(openWorldBoss(fakeClient)).resolves.toBeNull();
    await expect(loadWorldBossState()).resolves.toMatchObject({ status: 'idle', boss: null });
    expect(mocks.calls).toEqual([]);
  });
});

describe('closeWorldBossAndResolve', () => {
  it('résout, récompense, archive, diffuse puis remet l’état à idle, dans cet ordre', async () => {
    const opened = await openWorldBoss(null);
    await saveWorldBossState({ ...opened!, defenders: [makeDefender('u1', 'g1')] });
    mocks.calls.length = 0;

    const finalState = await closeWorldBossAndResolve(fakeClient);

    expect(finalState?.status).toBe('reward_pending');
    expect(finalState?.result).not.toBeNull();
    expect(mocks.calls).toEqual(['rewards', 'broadcast']);

    const history = await loadWorldBossHistory();
    expect(history.entries).toHaveLength(1);
    expect(history.lastParticipantsCount).toBe(1);

    await expect(loadWorldBossState()).resolves.toMatchObject({ status: 'idle', boss: null });
  });

  it('ne résout rien hors état registration', async () => {
    await expect(closeWorldBossAndResolve(fakeClient)).resolves.toBeNull();
    expect(mocks.calls).toEqual([]);
  });

  it('remet l’état à idle même si la diffusion du résultat échoue', async () => {
    await openWorldBoss(null);
    mocks.broadcastWorldBossEmbed.mockRejectedValueOnce(new Error('Discord indisponible'));

    const finalState = await closeWorldBossAndResolve(fakeClient);

    expect(finalState?.status).toBe('reward_pending');
    await expect(loadWorldBossState()).resolves.toMatchObject({ status: 'idle' });
    await expect(loadWorldBossHistory()).resolves.toMatchObject({ lastParticipantsCount: 0 });
  });

  it('archive l’événement même sans aucun inscrit', async () => {
    await openWorldBoss(null);

    const finalState = await closeWorldBossAndResolve(fakeClient);

    expect(finalState?.result).toMatchObject({ success: false, participantsCount: 0 });
    const history = await loadWorldBossHistory();
    expect(history.entries).toHaveLength(1);
    expect(history.defeatedBossIds).toEqual([]);
  });
});
