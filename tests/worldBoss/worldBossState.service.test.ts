import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tmp = vi.hoisted(() => {
  const os = require('node:os') as typeof import('node:os');
  const path = require('node:path') as typeof import('node:path');
  const fs = require('node:fs') as typeof import('node:fs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-state-'));
  return { dir, stateFile: path.join(dir, 'world-boss.json') };
});

vi.mock('../../src/config/paths', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/config/paths')>()),
  WORLD_BOSS_DB: tmp.stateFile,
}));

import {
  createEmptyWorldBossState,
  loadWorldBossState,
  resetWorldBossState,
  saveWorldBossState,
  updateWorldBossState,
} from '../../src/features/worldBoss/worldBossState.service';
import { WorldBossDefender } from '../../src/types/worldBoss/WorldBossDefender';

function makeDefender(userId: string, guildId = 'g1'): WorldBossDefender {
  return {
    userId,
    guildId,
    guildName: `Serveur ${guildId}`,
    displayName: `Joueur ${userId}`,
    pokemonId: 95,
    pokemonName: 'Onix',
    attackType: 'ground',
    registeredAt: new Date().toISOString(),
    snapshot: {
      types: ['rock', 'ground'],
      defenseEffectiveness: { water: 4 },
      stats: { hp: 35, attack: 45, defense: 160, specialAttack: 30, specialDefense: 45, speed: 70 },
    },
  };
}

beforeEach(() => {
  fs.rmSync(tmp.stateFile, { force: true });
});

afterEach(() => {
  fs.rmSync(tmp.stateFile, { force: true });
});

describe('loadWorldBossState', () => {
  it('retourne un état vide quand le fichier est absent, sans le créer', async () => {
    const state = await loadWorldBossState();

    expect(state).toEqual(createEmptyWorldBossState());
    expect(fs.existsSync(tmp.stateFile)).toBe(false);
  });

  it('retourne un état vide quand le JSON est corrompu plutôt que de crasher', async () => {
    fs.writeFileSync(tmp.stateFile, '{ "status": "regis', 'utf-8');

    await expect(loadWorldBossState()).resolves.toEqual(createEmptyWorldBossState());
  });

  it('complète les champs manquants d’un état partiel', async () => {
    fs.writeFileSync(tmp.stateFile, JSON.stringify({ status: 'registration' }), 'utf-8');

    const state = await loadWorldBossState();

    expect(state.status).toBe('registration');
    expect(state.defenders).toEqual([]);
    expect(state.boss).toBeNull();
    expect(state.result).toBeNull();
    expect(state.reward).toBeNull();
  });

  it('relit ce que saveWorldBossState a écrit', async () => {
    const state = createEmptyWorldBossState();
    state.worldBossId = 'wb-2026-08-30';
    state.status = 'registration';
    state.defenders = [makeDefender('u1')];

    await saveWorldBossState(state);

    await expect(loadWorldBossState()).resolves.toEqual(state);
  });
});

describe('updateWorldBossState', () => {
  it('retourne ce que le mutateur retourne et persiste la mutation', async () => {
    const count = await updateWorldBossState((state) => {
      state.status = 'registration';
      state.defenders.push(makeDefender('u1'));
      return state.defenders.length;
    });

    expect(count).toBe(1);
    const reloaded = await loadWorldBossState();
    expect(reloaded.status).toBe('registration');
    expect(reloaded.defenders).toHaveLength(1);
  });

  it('ne perd aucune des 20 inscriptions concurrentes', async () => {
    await saveWorldBossState({ ...createEmptyWorldBossState(), status: 'registration' });

    const userIds = Array.from({ length: 20 }, (_, index) => `u${index}`);
    await Promise.all(
      userIds.map((userId) =>
        updateWorldBossState((state) => {
          state.defenders.push(makeDefender(userId, `g${Number(userId.slice(1)) % 3}`));
        }),
      ),
    );

    const state = await loadWorldBossState();
    expect(state.defenders).toHaveLength(20);
    expect(state.defenders.map((defender) => defender.userId).sort()).toEqual([...userIds].sort());
  });

  it('libère le verrou quand le mutateur lève, sans bloquer les suivants', async () => {
    await expect(
      updateWorldBossState(() => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    await updateWorldBossState((state) => {
      state.defenders.push(makeDefender('u1'));
    });

    await expect(loadWorldBossState()).resolves.toMatchObject({ defenders: [expect.anything()] });
  });
});

describe('resetWorldBossState', () => {
  it('réécrit un état vide et le retourne', async () => {
    await saveWorldBossState({
      ...createEmptyWorldBossState(),
      status: 'resolved',
      defenders: [makeDefender('u1')],
    });

    const reset = await resetWorldBossState();

    expect(reset).toEqual(createEmptyWorldBossState());
    await expect(loadWorldBossState()).resolves.toEqual(createEmptyWorldBossState());
  });
});

describe('surface de l’API', () => {
  it('n’expose aucune fonction prenant un guildId : l’état est mondial', () => {
    expect(loadWorldBossState.length).toBe(0);
    expect(resetWorldBossState.length).toBe(0);
    expect(saveWorldBossState.length).toBe(1);
    expect(updateWorldBossState.length).toBe(1);
  });
});
