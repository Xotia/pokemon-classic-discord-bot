import { describe, expect, it } from 'vitest';
import { resolveWorldBoss } from '../../src/features/worldBoss/resolveWorldBoss';
import { createEmptyWorldBossState } from '../../src/features/worldBoss/worldBossState.service';
import { WorldBossDefender } from '../../src/types/worldBoss/WorldBossDefender';
import { WorldBossState } from '../../src/types/worldBoss/WorldBossState';

const BASE_STATS = { hp: 10, attack: 10, defense: 10, specialAttack: 10, specialDefense: 10, speed: 10 };

function makeState(overrides: Partial<WorldBossState> = {}): WorldBossState {
  return {
    ...createEmptyWorldBossState(),
    worldBossId: 'world-boss-1',
    status: 'registration',
    boss: {
      id: 'wb-a',
      name: 'Giratina',
      portal: 'Faille',
      sprite: '',
      types: ['ghost'],
      attackType: 'ghost',
      difficulty: 2,
      baseStats: BASE_STATS,
      finalStats: { hp: 20, attack: 20, defense: 20, specialAttack: 20, specialDefense: 20, speed: 20 },
      defenseEffectiveness: {},
      lore: '',
    },
    ...overrides,
  };
}

function makeDefender(userId: string, guildId: string, statValue: number): WorldBossDefender {
  return {
    userId,
    guildId,
    guildName: `Serveur ${guildId}`,
    displayName: `Joueur ${userId}`,
    pokemonId: 1,
    pokemonName: 'Bulbizarre',
    attackType: 'grass',
    registeredAt: '2026-08-30T11:00:00.000Z',
    snapshot: {
      types: ['grass'],
      defenseEffectiveness: {},
      stats: {
        hp: statValue,
        attack: statValue,
        defense: statValue,
        specialAttack: statValue,
        specialDefense: statValue,
        speed: statValue,
      },
    },
  };
}

describe('resolveWorldBoss', () => {
  it('déclare la victoire quand l’équipe dépasse le boss sur toutes les stats', () => {
    const state = resolveWorldBoss(
      makeState({ defenders: [makeDefender('u1', 'g1', 15), makeDefender('u2', 'g2', 15)] }),
    );

    expect(state.status).toBe('resolved');
    expect(state.resolvedAt).toBeTruthy();
    expect(state.result).toMatchObject({ success: true, participantsCount: 2, guildsCount: 2 });
    expect(state.result?.teamStats.attack).toBe(30);
  });

  it('déclare la défaite et liste les stats manquantes', () => {
    const state = resolveWorldBoss(makeState({ defenders: [makeDefender('u1', 'g1', 5)] }));

    expect(state.result?.success).toBe(false);
    expect(state.result?.missingStats.length).toBeGreaterThan(0);
    expect(state.result?.guildsCount).toBe(1);
  });

  it('compte les serveurs représentés, pas les défenseurs', () => {
    const state = resolveWorldBoss(
      makeState({
        defenders: [
          makeDefender('u1', 'g1', 5),
          makeDefender('u2', 'g1', 5),
          makeDefender('u3', 'g2', 5),
        ],
      }),
    );

    expect(state.result?.participantsCount).toBe(3);
    expect(state.result?.guildsCount).toBe(2);
  });

  it('traite zéro défenseur en défaite, avec les écarts sur les appariements inversés', () => {
    const state = resolveWorldBoss(makeState());

    expect(state.status).toBe('resolved');
    expect(state.result).toMatchObject({ success: false, participantsCount: 0, guildsCount: 0 });
    expect(state.result?.teamStats).toEqual({
      hp: 0, attack: 0, specialAttack: 0, defense: 0, specialDefense: 0, speed: 0,
    });
    // L'attaque de l'équipe affronte la défense du boss, et réciproquement.
    expect(state.result?.statDiffs.attack).toBe(-20);
    expect(state.result?.statDiffs.speed).toBe(-20);
    expect(state.result?.missingStats).toEqual([
      'attack', 'specialAttack', 'defense', 'specialDefense', 'speed',
    ]);
  });

  it('refuse de résoudre sans boss actif', () => {
    expect(() => resolveWorldBoss(createEmptyWorldBossState())).toThrow('WORLD_BOSS_NOT_ACTIVE');
  });
});
