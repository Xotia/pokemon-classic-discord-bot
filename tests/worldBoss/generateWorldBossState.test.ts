import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorldBossEntry } from '../../src/types/worldBoss/WorldBossEntry';
import { WorldBossHistory } from '../../src/types/worldBoss/WorldBossHistory';

vi.mock('../../src/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  getLoggerForGuild: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mocks = vi.hoisted(() => ({
  getWorldBossCatalog: vi.fn(),
  loadWorldBossHistory: vi.fn(),
}));

vi.mock('../../src/features/worldBoss/worldBossCatalog', () => ({
  getWorldBossCatalog: mocks.getWorldBossCatalog,
}));

vi.mock('../../src/features/worldBoss/worldBossHistory.service', () => ({
  loadWorldBossHistory: mocks.loadWorldBossHistory,
}));

import { generateWorldBossState } from '../../src/features/worldBoss/generateWorldBossState';

function makeEntry(id: string): WorldBossEntry {
  return {
    id,
    name: `Boss ${id}`,
    portal: 'Faille de test',
    sprite: 'https://exemple/sprite.png',
    types: ['ghost', 'dragon'],
    attackType: 'ghost',
    stats: { hp: 150, attack: 120, defense: 100, specialAttack: 120, specialDefense: 100, speed: 90 },
    defenseEffectiveness: { dark: 2, normal: 0 },
    lore: 'Contexte.',
  };
}

function makeHistory(overrides: Partial<WorldBossHistory> = {}): WorldBossHistory {
  return {
    lastParticipantsCount: 0,
    lastBossId: null,
    defeatedBossIds: [],
    entries: [],
    ...overrides,
  };
}

const CATALOG = [makeEntry('wb-a'), makeEntry('wb-b')];

beforeEach(() => {
  mocks.getWorldBossCatalog.mockReturnValue(CATALOG);
  mocks.loadWorldBossHistory.mockResolvedValue(makeHistory());
});

describe('generateWorldBossState — difficulté', () => {
  it('ouvre à 6 sur un premier événement', async () => {
    const state = await generateWorldBossState();

    expect(state?.boss?.difficulty).toBe(6);
    expect(state?.boss?.finalStats.hp).toBe(150 * 6);
  });

  it('ouvre à 6 quand le précédent n’a eu aucun inscrit', async () => {
    mocks.loadWorldBossHistory.mockResolvedValue(
      makeHistory({ lastParticipantsCount: 0, lastBossId: 'wb-a' }),
    );

    const state = await generateWorldBossState();

    expect(state?.boss?.difficulty).toBe(6);
  });

  it('reprend les 14 participants du précédent', async () => {
    mocks.loadWorldBossHistory.mockResolvedValue(makeHistory({ lastParticipantsCount: 14 }));

    const state = await generateWorldBossState();

    expect(state?.boss?.difficulty).toBe(14);
    expect(state?.boss?.finalStats).toEqual({
      hp: 150 * 14,
      attack: 120 * 14,
      defense: 100 * 14,
      specialAttack: 120 * 14,
      specialDefense: 100 * 14,
      speed: 90 * 14,
    });
  });
});

describe('generateWorldBossState — état produit', () => {
  it('pose le statut registration et la fenêtre d’inscription globale', async () => {
    const before = Date.now();
    const state = await generateWorldBossState();

    expect(state).not.toBeNull();
    expect(state!.status).toBe('registration');
    expect(state!.worldBossId).toMatch(/^world-boss-\d+$/);
    expect(state!.defenders).toEqual([]);
    expect(state!.result).toBeNull();
    expect(state!.reward).toBeNull();

    const opensAt = new Date(state!.registrationOpensAt!).getTime();
    const closesAt = new Date(state!.registrationClosesAt!).getTime();
    expect(state!.createdAt).toBe(state!.registrationOpensAt);
    expect(opensAt).toBeGreaterThanOrEqual(before);
    // Créneau par défaut : dimanche 12h -> 20h, soit 8 heures.
    expect(closesAt - opensAt).toBe(8 * 60 * 60 * 1000);
  });

  it('recopie l’entrée de la liste dans le boss instancié', async () => {
    mocks.getWorldBossCatalog.mockReturnValue([makeEntry('wb-a')]);

    const state = await generateWorldBossState();

    expect(state!.boss).toMatchObject({
      id: 'wb-a',
      name: 'Boss wb-a',
      portal: 'Faille de test',
      types: ['ghost', 'dragon'],
      attackType: 'ghost',
      baseStats: { hp: 150 },
      defenseEffectiveness: { dark: 2, normal: 0 },
    });
  });
});

describe('generateWorldBossState — vivier', () => {
  it('n’ouvre rien quand tous les boss sont vaincus', async () => {
    mocks.loadWorldBossHistory.mockResolvedValue(
      makeHistory({ defeatedBossIds: ['wb-a', 'wb-b'] }),
    );

    await expect(generateWorldBossState()).resolves.toBeNull();
  });

  it('exclut le boss vaincu du tirage sur un grand nombre d’ouvertures', async () => {
    mocks.loadWorldBossHistory.mockResolvedValue(makeHistory({ defeatedBossIds: ['wb-a'] }));

    for (let i = 0; i < 100; i++) {
      const state = await generateWorldBossState();
      expect(state?.boss?.id).toBe('wb-b');
    }
  });

  it('ignore un id vaincu absent de la liste', async () => {
    mocks.loadWorldBossHistory.mockResolvedValue(
      makeHistory({ defeatedBossIds: ['wb-entree-supprimee'] }),
    );

    const state = await generateWorldBossState();

    expect(['wb-a', 'wb-b']).toContain(state?.boss?.id);
  });
});

describe('generateWorldBossState — forçage admin', () => {
  it('respecte un bossId et une difficulté forcés', async () => {
    const state = await generateWorldBossState({ bossId: 'wb-b', difficulty: 3 });

    expect(state?.boss?.id).toBe('wb-b');
    expect(state?.boss?.difficulty).toBe(3);
    expect(state?.boss?.finalStats.attack).toBe(120 * 3);
  });

  it('refuse un bossId déjà vaincu en le disant', async () => {
    mocks.loadWorldBossHistory.mockResolvedValue(makeHistory({ defeatedBossIds: ['wb-a'] }));

    await expect(generateWorldBossState({ bossId: 'wb-a' })).rejects.toThrow(/déjà vaincu/);
  });

  it('refuse un bossId inconnu de la liste', async () => {
    await expect(generateWorldBossState({ bossId: 'wb-inconnu' })).rejects.toThrow(/inconnu/);
  });

  it('refuse une difficulté forcée invalide', async () => {
    await expect(generateWorldBossState({ difficulty: 0 })).rejects.toThrow(/Difficulté forcée/);
    await expect(generateWorldBossState({ difficulty: 1.5 })).rejects.toThrow(/Difficulté forcée/);
  });
});
