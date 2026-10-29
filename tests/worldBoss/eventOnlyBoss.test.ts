import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorldBossEntry } from '../../src/types/worldBoss/WorldBossEntry';

vi.mock('../../src/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  getLoggerForGuild: vi.fn(),
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

import {
  getAliveWorldBosses,
  getForceableWorldBosses,
  selectWorldBoss,
} from '../../src/features/worldBoss/selectWorldBoss';
import { generateWorldBossState } from '../../src/features/worldBoss/generateWorldBossState';

function makeEntry(id: string, eventOnly = false): WorldBossEntry {
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
    ...(eventOnly ? { eventOnly: true } : {}),
  };
}

const WEEKLY = [makeEntry('wb-a'), makeEntry('wb-b')];
const EVENT = makeEntry('wb-event', true);
const CATALOG = [...WEEKLY, EVENT];

beforeEach(() => {
  mocks.getWorldBossCatalog.mockReturnValue(CATALOG);
  mocks.loadWorldBossHistory.mockResolvedValue({
    lastParticipantsCount: 0,
    lastBossId: null,
    defeatedBossIds: [],
    entries: [],
  });
});

describe('boss eventOnly : tirage', () => {
  it('est exclu du vivier hebdomadaire mais reste forçable', () => {
    expect(getAliveWorldBosses([], CATALOG).map((boss) => boss.id)).toEqual(['wb-a', 'wb-b']);
    expect(getForceableWorldBosses([], CATALOG).map((boss) => boss.id)).toContain('wb-event');
    expect(getForceableWorldBosses(['wb-event'], CATALOG).map((boss) => boss.id)).not.toContain('wb-event');
  });

  it('n’est jamais tiré au hasard', () => {
    const drawn = new Set<string>();
    for (let i = 0; i < 500; i++) drawn.add(selectWorldBoss([], CATALOG)!.id);

    expect(drawn.has('wb-event')).toBe(false);
  });

  it('seul vivant : vivier épuisé (null), jamais tiré', () => {
    expect(selectWorldBoss([], [EVENT])).toBeNull();
    expect(selectWorldBoss(['wb-a', 'wb-b'], CATALOG)).toBeNull();
  });
});

describe('boss eventOnly : génération', () => {
  it('est trouvé quand il est forcé par id', async () => {
    const state = await generateWorldBossState({ bossId: 'wb-event' });

    expect(state?.boss?.id).toBe('wb-event');
  });

  it('applique une fin d’inscriptions forcée', async () => {
    const state = await generateWorldBossState({
      bossId: 'wb-event',
      registrationClosesAt: new Date('2026-10-31T19:00:00Z'),
    });

    expect(state?.registrationClosesAt).toBe('2026-10-31T19:00:00.000Z');
  });

  it('sans forçage, ne tire jamais l’évènement', async () => {
    mocks.getWorldBossCatalog.mockReturnValue([EVENT]);

    expect(await generateWorldBossState()).toBeNull();
  });
});
