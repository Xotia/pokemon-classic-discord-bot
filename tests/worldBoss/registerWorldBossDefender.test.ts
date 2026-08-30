import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  getLoggerForGuild: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const tmp = vi.hoisted(() => {
  const os = require('node:os') as typeof import('node:os');
  const path = require('node:path') as typeof import('node:path');
  const fs = require('node:fs') as typeof import('node:fs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-register-'));
  return { stateFile: path.join(dir, 'world-boss.json') };
});

vi.mock('../../src/config/paths', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/config/paths')>()),
  WORLD_BOSS_DB: tmp.stateFile,
}));

import { registerWorldBossDefender } from '../../src/features/worldBoss/registerWorldBossDefender';
import {
  createEmptyWorldBossState,
  loadWorldBossState,
  saveWorldBossState,
} from '../../src/features/worldBoss/worldBossState.service';
import { RegisterWorldBossDefenderParams } from '../../src/types/worldBoss/RegisterWorldBossDefenderParams';
import { WorldBossState } from '../../src/types/worldBoss/WorldBossState';

function makeParams(
  userId: string,
  guildId: string,
  overrides: Partial<RegisterWorldBossDefenderParams> = {},
): RegisterWorldBossDefenderParams {
  return {
    userId,
    guildId,
    guildName: `Serveur ${guildId}`,
    displayName: `Joueur ${userId} sur ${guildId}`,
    pokemonId: 95,
    pokemonName: 'Onix',
    attackType: 'ground',
    snapshot: {
      types: ['rock', 'ground'],
      defenseEffectiveness: { water: 4 },
      stats: { hp: 35, attack: 45, defense: 160, specialAttack: 30, specialDefense: 45, speed: 70 },
    },
    ...overrides,
  };
}

function openState(overrides: Partial<WorldBossState> = {}): WorldBossState {
  return {
    ...createEmptyWorldBossState(),
    worldBossId: 'world-boss-1',
    status: 'registration',
    registrationOpensAt: new Date(Date.now() - 60_000).toISOString(),
    registrationClosesAt: new Date(Date.now() + 3_600_000).toISOString(),
    boss: {
      id: 'wb-a',
      name: 'Boss wb-a',
      portal: 'Faille de test',
      sprite: 'https://exemple/sprite.png',
      types: ['ghost'],
      attackType: 'ghost',
      difficulty: 6,
      baseStats: { hp: 150, attack: 120, defense: 100, specialAttack: 120, specialDefense: 100, speed: 90 },
      finalStats: { hp: 900, attack: 720, defense: 600, specialAttack: 720, specialDefense: 600, speed: 540 },
      defenseEffectiveness: { dark: 2 },
      lore: 'Contexte.',
    },
    ...overrides,
  };
}

beforeEach(async () => {
  await saveWorldBossState(openState());
});

afterEach(() => {
  fs.rmSync(tmp.stateFile, { force: true });
});

describe('registerWorldBossDefender', () => {
  it('inscrit un joueur dans l’équipe mondiale', async () => {
    const state = await registerWorldBossDefender(makeParams('u1', 'g1'));

    expect(state.defenders).toHaveLength(1);
    expect(state.defenders[0]).toMatchObject({ userId: 'u1', guildId: 'g1', pokemonName: 'Onix' });
    expect(state.defenders[0].registeredAt).toBeTruthy();

    await expect(loadWorldBossState()).resolves.toMatchObject({ defenders: [{ userId: 'u1' }] });
  });

  it('remplace l’inscription précédente depuis le MÊME serveur', async () => {
    await registerWorldBossDefender(makeParams('u1', 'g1'));
    const state = await registerWorldBossDefender(
      makeParams('u1', 'g1', { pokemonId: 6, pokemonName: 'Dracaufeu', attackType: 'fire' }),
    );

    expect(state.defenders).toHaveLength(1);
    expect(state.defenders[0]).toMatchObject({ pokemonName: 'Dracaufeu', guildId: 'g1' });
  });

  it('remplace l’inscription et bascule le guildId depuis un AUTRE serveur', async () => {
    await registerWorldBossDefender(makeParams('u1', 'g1'));
    const state = await registerWorldBossDefender(
      makeParams('u1', 'g2', { displayName: 'Pseudo sur g2' }),
    );

    expect(state.defenders).toHaveLength(1);
    expect(state.defenders[0]).toMatchObject({
      userId: 'u1',
      guildId: 'g2',
      guildName: 'Serveur g2',
      displayName: 'Pseudo sur g2',
    });
  });

  it('garde une entrée par joueur quand plusieurs joueurs de serveurs différents s’inscrivent', async () => {
    await registerWorldBossDefender(makeParams('u1', 'g1'));
    await registerWorldBossDefender(makeParams('u2', 'g2'));
    const state = await registerWorldBossDefender(makeParams('u3', 'g1'));

    expect(state.defenders.map((defender) => defender.userId)).toEqual(['u1', 'u2', 'u3']);
  });

  it('refuse hors état registration', async () => {
    await saveWorldBossState(openState({ status: 'idle', boss: null }));

    await expect(registerWorldBossDefender(makeParams('u1', 'g1'))).rejects.toThrow(
      'WORLD_BOSS_NOT_OPEN',
    );
  });

  it('refuse après la fermeture des inscriptions', async () => {
    await saveWorldBossState(
      openState({ registrationClosesAt: new Date(Date.now() - 1_000).toISOString() }),
    );

    await expect(registerWorldBossDefender(makeParams('u1', 'g1'))).rejects.toThrow(
      'WORLD_BOSS_REGISTRATION_CLOSED',
    );
  });

  it('n’écrit aucun défenseur quand l’inscription est refusée', async () => {
    await saveWorldBossState(openState({ status: 'resolved' }));

    await expect(registerWorldBossDefender(makeParams('u1', 'g1'))).rejects.toThrow();
    await expect(loadWorldBossState()).resolves.toMatchObject({ defenders: [] });
  });

  it('ne perd aucune inscription concurrente venue de plusieurs serveurs', async () => {
    const registrations = Array.from({ length: 12 }, (_, index) =>
      registerWorldBossDefender(makeParams(`u${index}`, `g${index % 3}`)),
    );

    await Promise.all(registrations);

    const state = await loadWorldBossState();
    expect(state.defenders).toHaveLength(12);
  });

  it('ne compte qu’une entrée quand le même joueur s’inscrit des deux serveurs en concurrence', async () => {
    await Promise.all([
      registerWorldBossDefender(makeParams('u1', 'g1')),
      registerWorldBossDefender(makeParams('u1', 'g2')),
    ]);

    const state = await loadWorldBossState();
    expect(state.defenders).toHaveLength(1);
    expect(['g1', 'g2']).toContain(state.defenders[0].guildId);
  });
});
