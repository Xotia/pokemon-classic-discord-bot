import { describe, expect, it } from 'vitest';
import { loadWorldBossList } from '../../src/features/worldBoss/worldBossCatalog';
import { getForceableWorldBosses } from '../../src/features/worldBoss/selectWorldBoss';
import { HALLOWEEN_WORLD_BOSS_ID } from '../../src/features/halloweenEvent/halloweenEventConfig';

describe('boss d’Halloween dans le vrai catalogue', () => {
  const catalog = loadWorldBossList();

  it('existe : Ectoplasma Gigamax, non eventOnly', () => {
    const boss = catalog.find((b) => b.id === HALLOWEEN_WORLD_BOSS_ID);
    expect(boss?.name).toBe('Ectoplasma Gigamax');
    expect(boss?.eventOnly).toBeFalsy();
  });

  it('est forçable tant qu’il n’est pas vaincu, et plus une fois vaincu', () => {
    expect(getForceableWorldBosses([], catalog).some((b) => b.id === HALLOWEEN_WORLD_BOSS_ID)).toBe(true);
    expect(
      getForceableWorldBosses([HALLOWEEN_WORLD_BOSS_ID], catalog).some((b) => b.id === HALLOWEEN_WORLD_BOSS_ID),
    ).toBe(false);
  });

  it('ne contient plus l’ancienne entrée Darkrai', () => {
    expect(catalog.some((b) => b.id === 'wb-halloween-2026-darkrai')).toBe(false);
  });
});
