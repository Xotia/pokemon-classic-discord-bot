import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearWorldBossCatalogCache,
  getWorldBossCatalog,
  getWorldBossEntry,
  loadWorldBossList,
  parseWorldBossList,
} from '../../src/features/worldBoss/worldBossCatalog';
import { TYPE_LABELS } from '../../src/config/typeLabels';

const VALID_ENTRY = {
  id: 'wb-test-001',
  name: 'Boss de test',
  portal: 'Portail de test',
  sprite: 'https://exemple/sprite.png',
  types: ['ghost', 'dragon'],
  attackType: 'ghost',
  stats: {
    hp: 150,
    attack: 120,
    defense: 100,
    specialAttack: 120,
    specialDefense: 100,
    speed: 90,
  },
  defenseEffectiveness: { dark: 2, normal: 0, water: 0.5, grass: 0.25, ice: 4 },
  lore: 'Une ligne de contexte.',
};

function listWith(overrides: Record<string, unknown>) {
  return { bosses: [{ ...VALID_ENTRY, ...overrides }] };
}

describe('parseWorldBossList — cas valide', () => {
  it('accepte une entrée conforme et la retourne telle quelle', () => {
    const bosses = parseWorldBossList(listWith({}));
    expect(bosses).toHaveLength(1);
    expect(bosses[0].id).toBe('wb-test-001');
    expect(bosses[0].attackType).toBe('ghost');
  });

  it('accepte un defenseEffectiveness vide (tout est neutre)', () => {
    expect(() => parseWorldBossList(listWith({ defenseEffectiveness: {} }))).not.toThrow();
  });
});

describe('parseWorldBossList — rejets', () => {
  it('rejette un attackType absent de types', () => {
    expect(() => parseWorldBossList(listWith({ attackType: 'fire' }))).toThrow(
      /wb-test-001.*attackType.*types/s,
    );
  });

  it('rejette un type inconnu dans types', () => {
    expect(() => parseWorldBossList(listWith({ types: ['ghost', 'plasma'] }))).toThrow(
      /wb-test-001.*type inconnu.*plasma/s,
    );
  });

  it('rejette une statistique manquante', () => {
    const { specialDefense, ...stats } = VALID_ENTRY.stats;
    expect(() => parseWorldBossList(listWith({ stats }))).toThrow(
      /wb-test-001.*specialDefense/s,
    );
  });

  it('rejette une statistique nulle ou négative', () => {
    expect(() =>
      parseWorldBossList(listWith({ stats: { ...VALID_ENTRY.stats, hp: 0 } })),
    ).toThrow(/wb-test-001.*hp.*strictement positive/s);
  });

  it('rejette un id vide', () => {
    expect(() => parseWorldBossList(listWith({ id: '  ' }))).toThrow(/"id"/);
  });

  it('rejette un id dupliqué', () => {
    expect(() => parseWorldBossList({ bosses: [VALID_ENTRY, VALID_ENTRY] })).toThrow(
      /wb-test-001.*dupliqué/s,
    );
  });

  it('rejette un type inconnu dans defenseEffectiveness', () => {
    expect(() =>
      parseWorldBossList(listWith({ defenseEffectiveness: { plasma: 2 } })),
    ).toThrow(/wb-test-001.*defenseEffectiveness.*plasma/s);
  });

  it('rejette un multiplicateur hors barème', () => {
    expect(() =>
      parseWorldBossList(listWith({ defenseEffectiveness: { water: 1.5 } })),
    ).toThrow(/wb-test-001.*water.*1\.5/s);
  });

  it('rejette une liste vide ou un fichier sans "bosses"', () => {
    expect(() => parseWorldBossList({ bosses: [] })).toThrow(/vide/);
    expect(() => parseWorldBossList({})).toThrow(/"bosses"/);
    expect(() => parseWorldBossList([])).toThrow(/objet racine/);
  });
});

describe('loadWorldBossList — lecture disque', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-boss-list-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('lit et valide un fichier conforme', () => {
    const file = path.join(tmpDir, 'list.json');
    fs.writeFileSync(file, JSON.stringify(listWith({})), 'utf-8');
    expect(loadWorldBossList(file)).toHaveLength(1);
  });

  it('échoue explicitement si le fichier est absent', () => {
    expect(() => loadWorldBossList(path.join(tmpDir, 'absent.json'))).toThrow(/introuvable/);
  });

  it('échoue explicitement si le JSON est illisible', () => {
    const file = path.join(tmpDir, 'broken.json');
    fs.writeFileSync(file, '{ "bosses": [', 'utf-8');
    expect(() => loadWorldBossList(file)).toThrow(/JSON illisible/);
  });
});

describe('data/world-boss-list.json', () => {
  beforeEach(() => clearWorldBossCatalogCache());
  afterEach(() => clearWorldBossCatalogCache());

  it('est valide et contient au moins trois boss', () => {
    const bosses = getWorldBossCatalog();
    expect(bosses.length).toBeGreaterThanOrEqual(3);
    for (const boss of bosses) {
      expect(boss.types).toContain(boss.attackType);
      for (const type of boss.types) expect(TYPE_LABELS[type]).toBeTruthy();
    }
  });

  it('sert la même instance depuis le cache et la relit après invalidation', () => {
    const first = getWorldBossCatalog();
    expect(getWorldBossCatalog()).toBe(first);
    clearWorldBossCatalogCache();
    expect(getWorldBossCatalog()).not.toBe(first);
  });

  it('retrouve un boss par id et retourne null sinon', () => {
    const id = getWorldBossCatalog()[0].id;
    expect(getWorldBossEntry(id)?.id).toBe(id);
    expect(getWorldBossEntry('wb-inexistant')).toBeNull();
  });
});
