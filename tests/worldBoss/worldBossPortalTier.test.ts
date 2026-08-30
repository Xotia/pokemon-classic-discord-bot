import { describe, expect, it } from 'vitest';
import {
  WORLD_BOSS_PORTAL_TIERS,
  formatWorldBossPortalName,
  formatWorldBossPortalTier,
  getWorldBossPortalTier,
} from '../../src/features/worldBoss/worldBossPortalTier';

describe('getWorldBossPortalTier', () => {
  it('associe une couleur à chaque difficulté de 1 à 9', () => {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((difficulty) =>
      getWorldBossPortalTier(difficulty).id,
    );

    expect(ids).toEqual([
      'green',
      'blue',
      'yellow',
      'orange',
      'red',
      'violet',
      'copper',
      'black',
      'white',
    ]);
  });

  it('absorbe toute difficulté au-delà du dernier palier', () => {
    expect(getWorldBossPortalTier(10).id).toBe('white');
    expect(getWorldBossPortalTier(250).id).toBe('white');
  });

  it('retombe sur le palier le plus bas sous le premier seuil', () => {
    expect(getWorldBossPortalTier(0).id).toBe('green');
    expect(getWorldBossPortalTier(-3).id).toBe('green');
  });

  it('rend une couleur affichable par Discord, jamais le noir absolu', () => {
    // 0x000000 est interprété par Discord comme « pas de couleur » : la barre
    // latérale disparaîtrait sur le palier noir.
    for (const tier of WORLD_BOSS_PORTAL_TIERS) {
      expect(tier.color).toBeGreaterThan(0);
      expect(tier.color).toBeLessThanOrEqual(0xffffff);
    }
  });
});

describe('WORLD_BOSS_PORTAL_TIERS', () => {
  it('est trié par seuil croissant, sans doublon', () => {
    const thresholds = WORLD_BOSS_PORTAL_TIERS.map((tier) => tier.minDifficulty);

    expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
    expect(new Set(thresholds).size).toBe(thresholds.length);
  });

  it('donne un identifiant, une couleur et un emoji uniques à chaque palier', () => {
    const ids = WORLD_BOSS_PORTAL_TIERS.map((tier) => tier.id);
    const colors = WORLD_BOSS_PORTAL_TIERS.map((tier) => tier.color);
    const emojis = WORLD_BOSS_PORTAL_TIERS.map((tier) => tier.emoji);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(colors).size).toBe(colors.length);
    expect(new Set(emojis).size).toBe(emojis.length);
  });
});

describe('formatWorldBossPortalTier', () => {
  it('rend un libellé joueur sans multiplicateur', () => {
    const label = formatWorldBossPortalTier(5);

    expect(label).toBe('🔴 Portail rouge');
    expect(label).not.toContain('×');
  });
});

describe('formatWorldBossPortalName', () => {
  it('nomme le portail par sa couleur, sans nom de brèche', () => {
    expect(formatWorldBossPortalName(4)).toBe('Portail orange');
    expect(formatWorldBossPortalName(9)).toBe('Portail blanc');
  });
});
