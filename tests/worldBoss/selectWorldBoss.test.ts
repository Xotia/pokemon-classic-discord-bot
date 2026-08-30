import { describe, expect, it, vi } from 'vitest';
import { getAliveWorldBosses, selectWorldBoss } from '../../src/features/worldBoss/selectWorldBoss';
import { WorldBossEntry } from '../../src/types/worldBoss/WorldBossEntry';

vi.mock('../../src/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  getLoggerForGuild: vi.fn(),
}));

function makeEntry(id: string): WorldBossEntry {
  return {
    id,
    name: `Boss ${id}`,
    portal: 'Portail de test',
    sprite: 'https://exemple/sprite.png',
    types: ['ghost'],
    attackType: 'ghost',
    stats: { hp: 150, attack: 120, defense: 100, specialAttack: 120, specialDefense: 100, speed: 90 },
    defenseEffectiveness: { dark: 2 },
    lore: 'Contexte.',
  };
}

const CATALOG = [makeEntry('wb-a'), makeEntry('wb-b'), makeEntry('wb-c')];

describe('getAliveWorldBosses', () => {
  it('retire les boss déjà vaincus', () => {
    const alive = getAliveWorldBosses(['wb-b'], CATALOG);

    expect(alive.map((boss) => boss.id)).toEqual(['wb-a', 'wb-c']);
  });

  it('ignore un id vaincu absent de la liste, sans erreur', () => {
    const alive = getAliveWorldBosses(['wb-supprime-de-la-liste'], CATALOG);

    expect(alive.map((boss) => boss.id)).toEqual(['wb-a', 'wb-b', 'wb-c']);
  });
});

describe('selectWorldBoss', () => {
  it('tire un boss du vivier', () => {
    const boss = selectWorldBoss([], CATALOG);

    expect(boss).not.toBeNull();
    expect(CATALOG.map((entry) => entry.id)).toContain(boss?.id);
  });

  it('ne tire jamais un boss vaincu, sur un grand nombre de tirages', () => {
    const drawn = new Set<string>();
    for (let i = 0; i < 500; i++) {
      drawn.add(selectWorldBoss(['wb-b'], CATALOG)?.id ?? 'null');
    }

    expect(drawn.has('wb-b')).toBe(false);
    expect([...drawn].sort()).toEqual(['wb-a', 'wb-c']);
  });

  it('couvre tout le vivier : le tirage est uniforme, pas figé sur la première entrée', () => {
    const drawn = new Set<string>();
    for (let i = 0; i < 500; i++) {
      drawn.add(selectWorldBoss([], CATALOG)!.id);
    }

    expect([...drawn].sort()).toEqual(['wb-a', 'wb-b', 'wb-c']);
  });

  it('retourne null quand tous les boss sont vaincus, sans lever', () => {
    expect(selectWorldBoss(['wb-a', 'wb-b', 'wb-c'], CATALOG)).toBeNull();
  });

  it('retourne null sur une liste vide', () => {
    expect(selectWorldBoss([], [])).toBeNull();
  });
});
