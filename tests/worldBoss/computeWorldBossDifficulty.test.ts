import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORLD_BOSS_DIFFICULTY,
  MIN_WORLD_BOSS_DIFFICULTY,
  computeWorldBossDifficulty,
} from '../../src/features/worldBoss/computeWorldBossDifficulty';

describe('computeWorldBossDifficulty', () => {
  it('vaut la valeur par défaut pour un premier événement', () => {
    expect(computeWorldBossDifficulty(0, false)).toBe(DEFAULT_WORLD_BOSS_DIFFICULTY);
  });

  it('ignore le compte quand il n’y a pas d’événement précédent', () => {
    // Un historique vide peut porter un lastParticipantsCount residuel : c'est
    // l'existence d'une entree qui fait foi, pas le compteur.
    expect(computeWorldBossDifficulty(12, false)).toBe(DEFAULT_WORLD_BOSS_DIFFICULTY);
  });

  it('reprend le nombre de participants du précédent', () => {
    expect(computeWorldBossDifficulty(14, true)).toBe(14);
  });

  it('n’est pas plafonnée : la masse du boss suit la population', () => {
    expect(computeWorldBossDifficulty(250, true)).toBe(250);
  });

  it('retombe au plancher après une semaine déserte, pas sur la valeur par défaut', () => {
    // Le coeur du reglage : 0 participant est une information (personne n'est
    // venu), pas une absence d'information. Le portail redescend au plus bas.
    const difficulty = computeWorldBossDifficulty(0, true);

    expect(difficulty).toBe(MIN_WORLD_BOSS_DIFFICULTY);
    expect(difficulty).not.toBe(DEFAULT_WORLD_BOSS_DIFFICULTY);
  });

  it('ne descend jamais sous 1 : des statistiques nulles rendraient le boss gratuit', () => {
    expect(computeWorldBossDifficulty(-5, true)).toBe(MIN_WORLD_BOSS_DIFFICULTY);
  });

  it('rend un entier même sur un compte aberrant', () => {
    expect(Number.isInteger(computeWorldBossDifficulty(3.7, true))).toBe(true);
    expect(computeWorldBossDifficulty(3.7, true)).toBe(3);
  });
});
