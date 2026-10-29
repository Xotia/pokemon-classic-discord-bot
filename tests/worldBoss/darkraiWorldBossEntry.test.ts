import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadWorldBossList } from '../../src/features/worldBoss/worldBossCatalog';
import { getAliveWorldBosses } from '../../src/features/worldBoss/selectWorldBoss';
import { HALLOWEEN_WORLD_BOSS_ID } from '../../src/features/halloweenEvent/halloweenEventConfig';

const DATA = path.resolve(__dirname, '..', '..', 'data');

describe('entrée Darkrai de data/world-boss-list.json', () => {
  const catalog = loadWorldBossList();
  const darkrai = catalog.find((boss) => boss.id === HALLOWEEN_WORLD_BOSS_ID);
  const knownTypes = Object.keys(JSON.parse(fs.readFileSync(path.join(DATA, 'all_types.json'), 'utf-8')));

  it('existe, est eventOnly et passe la validation du catalogue', () => {
    expect(darkrai).toBeDefined();
    expect(darkrai?.name).toBe('Darkrai');
    expect(darkrai?.eventOnly).toBe(true);
    expect(darkrai?.types).toEqual(['dark']);
    expect(darkrai?.attackType).toBe('dark');
  });

  it('reprend les stats de Darkrai du Pokédex (#491)', () => {
    const gen4 = JSON.parse(fs.readFileSync(path.join(DATA, 'pokemon-gen4.json'), 'utf-8'));
    const list = Array.isArray(gen4) ? gen4 : Object.values(gen4);
    const pokemon = list.find((p: any) => p.id === 491) as any;

    expect(darkrai?.stats).toEqual(pokemon.stats);
  });

  it('n’utilise que des types connus dans ses efficacités', () => {
    for (const type of Object.keys(darkrai!.defenseEffectiveness)) {
      expect(knownTypes).toContain(type);
    }
    expect(darkrai!.defenseEffectiveness).toMatchObject({
      psychic: 0,
      dark: 0.5,
      ghost: 0.5,
      bug: 2,
      fighting: 2,
      fairy: 2,
    });
  });

  it('n’entre pas dans le vivier hebdomadaire', () => {
    expect(getAliveWorldBosses([], catalog).some((boss) => boss.id === HALLOWEEN_WORLD_BOSS_ID)).toBe(false);
  });
});
