import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  getLoggerForGuild: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const tmp = vi.hoisted(() => {
  const os = require('node:os') as typeof import('node:os');
  const path = require('node:path') as typeof import('node:path');
  const fs = require('node:fs') as typeof import('node:fs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-rewards-'));
  return { dir, playersDb: (guildId: string) => path.join(dir, `${guildId}.json`) };
});

vi.mock('../../src/config/paths', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/config/paths')>()),
  playersDb: tmp.playersDb,
}));

import { applyWorldBossRewards } from '../../src/features/worldBoss/applyWorldBossRewards';
import { createEmptyWorldBossState } from '../../src/features/worldBoss/worldBossState.service';
import { addXp } from '../../src/methods/xp/xp';
import { Player, PlayersRecord } from '../../src/types/Player';
import { WorldBossDefender } from '../../src/types/worldBoss/WorldBossDefender';
import { WorldBossState } from '../../src/types/worldBoss/WorldBossState';

const STATS = { hp: 150, attack: 120, defense: 100, specialAttack: 120, specialDefense: 100, speed: 90 };
/** PV de base × difficulté × multiplicateur world boss. */
const REWARD = 150 * 6 * 10;

function makePlayer(name: string, overrides: Partial<Player> = {}): Player {
  return { name, pityCounter: 0, xp: 0, level: 1, researchData: 0, ...overrides };
}

function writePlayers(guildId: string, players: PlayersRecord) {
  fs.writeFileSync(tmp.playersDb(guildId), JSON.stringify(players, null, 2), 'utf-8');
}

function readPlayersFile(guildId: string): PlayersRecord {
  return JSON.parse(fs.readFileSync(tmp.playersDb(guildId), 'utf-8'));
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

function resolvedState(success: boolean, defenders: WorldBossDefender[]): WorldBossState {
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
      finalStats: { hp: 900, attack: 720, defense: 600, specialAttack: 720, specialDefense: 600, speed: 540 },
      defenseEffectiveness: {},
      lore: '',
    },
    defenders,
    result: {
      success,
      missingStats: success ? [] : ['attack'],
      participantsCount: defenders.length,
      guildsCount: new Set(defenders.map((d) => d.guildId)).size,
      teamStats: STATS,
      statDiffs: STATS,
    },
  };
}

beforeEach(() => {
  fs.rmSync(tmp.dir, { recursive: true, force: true });
  fs.mkdirSync(tmp.dir, { recursive: true });
});

describe('applyWorldBossRewards', () => {
  it('crédite les participants dans les players.json de leurs serveurs respectifs', async () => {
    writePlayers('g1', { u1: makePlayer('Sacha'), u2: makePlayer('Ondine', { xp: 500 }) });
    writePlayers('g2', { u3: makePlayer('Pierre', { researchData: 42, worldBossWins: 2 }) });

    const reward = await applyWorldBossRewards(
      resolvedState(true, [
        makeDefender('u1', 'g1'),
        makeDefender('u2', 'g1'),
        makeDefender('u3', 'g2'),
      ]),
    );

    expect(reward).toMatchObject({ rewardPerPlayer: REWARD, worldBossWin: true });
    expect(reward.rewardedUserIds.sort()).toEqual(['u1', 'u2', 'u3']);

    const g1 = readPlayersFile('g1');
    expect(g1.u1).toMatchObject({
      xp: addXp(0, REWARD).xp,
      level: addXp(0, REWARD).level,
      researchData: REWARD,
      worldBossWins: 1,
    });
    expect(g1.u2).toMatchObject({ xp: addXp(500, REWARD).xp, researchData: REWARD });

    const g2 = readPlayersFile('g2');
    expect(g2.u3).toMatchObject({ researchData: 42 + REWARD, worldBossWins: 3 });
  });

  it('n’applique aucun gain en cas de défaite', async () => {
    writePlayers('g1', { u1: makePlayer('Sacha') });

    const reward = await applyWorldBossRewards(resolvedState(false, [makeDefender('u1', 'g1')]));

    expect(reward).toEqual({ rewardPerPlayer: 0, worldBossWin: false, rewardedUserIds: [] });
    expect(readPlayersFile('g1').u1).toMatchObject({ xp: 0, researchData: 0 });
    expect(readPlayersFile('g1').u1.worldBossWins).toBeUndefined();
  });

  it('ignore un joueur dont le profil a disparu sans priver les autres', async () => {
    writePlayers('g1', { u1: makePlayer('Sacha') });
    writePlayers('g2', {});

    const reward = await applyWorldBossRewards(
      resolvedState(true, [makeDefender('u1', 'g1'), makeDefender('u-disparu', 'g2')]),
    );

    expect(reward.rewardedUserIds).toEqual(['u1']);
    expect(readPlayersFile('g1').u1.researchData).toBe(REWARD);
  });

  it('ne crédite personne quand l’équipe est vide', async () => {
    const reward = await applyWorldBossRewards(resolvedState(true, []));

    expect(reward).toMatchObject({ rewardPerPlayer: REWARD, rewardedUserIds: [] });
  });

  it('n’applique les gains qu’une fois par joueur, même serveur ou non', async () => {
    writePlayers('g1', { u1: makePlayer('Sacha') });

    await applyWorldBossRewards(resolvedState(true, [makeDefender('u1', 'g1')]));

    expect(readPlayersFile('g1').u1).toMatchObject({ researchData: REWARD, worldBossWins: 1 });
  });
});
