import { describe, expect, it } from 'vitest';
import { computeWorldBossDifficulty } from '../../src/features/worldBoss/computeWorldBossDifficulty';

describe('computeWorldBossDifficulty', () => {
  it('vaut 6 pour un premier événement', () => {
    expect(computeWorldBossDifficulty(0)).toBe(6);
  });

  it('vaut 6 quand le précédent n’a eu aucun inscrit', () => {
    expect(computeWorldBossDifficulty(0)).toBe(6);
  });

  it('reprend le nombre de participants du précédent', () => {
    expect(computeWorldBossDifficulty(14)).toBe(14);
  });

  it('n’est pas plafonnée : la masse du boss suit la population', () => {
    expect(computeWorldBossDifficulty(250)).toBe(250);
  });
});
