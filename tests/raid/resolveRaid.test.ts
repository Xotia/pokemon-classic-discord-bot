import { describe, it, expect } from "vitest";
import { RaidState } from "../../src/types/raid/RaidState";
import { RaidStats } from "../../src/types/raid/RaidStats";
import { computeBruteRaidResult } from "../../src/features/raid/computeBruteRaidResult";
import { resolveRaid } from "../../src/features/raid/resolveRaid";

function makeStats(value: number): RaidStats {
  return {
    hp: value,
    attack: value,
    specialAttack: value,
    defense: value,
    specialDefense: value,
    speed: value,
  };
}

function makeState(overrides: Partial<RaidState> = {}): RaidState {
  return {
    raidId: "raid-1",
    status: "registration",
    createdAt: "2026-06-16T10:00:00.000Z",
    registrationOpensAt: "2026-06-16T10:00:00.000Z",
    registrationClosesAt: "2026-06-16T18:00:00.000Z",
    resolvedAt: null,
    generation: 1,
    zone: "Test Zone",
    raidPokemon: {
      id: 999,
      name: "Bossmon",
      zone: "Test Zone",
      types: ["fire"],
      attackType: "fire",
      difficulty: 2,
      baseStats: makeStats(100),
      finalStats: makeStats(100),
      "defenseEffectiveness": {},
    },
    defenders: [],
    result: null,
    reward: null,
    ...overrides,
  };
}

it("computeBruteRaidResult gagne si toutes les stats de l'équipe dépassent le boss", () => {
  const state = makeState({
    defenders: [
      {
        userId: "u1",
        pokemonId: 1,
        pokemonName: "A",
        attackType: "normal",
        registeredAt: "2026-06-16T12:00:00.000Z",
        snapshot: {
          types: ["normal"],
          defenseEffectiveness: {},
          stats: makeStats(60),
        },
      },
      {
        userId: "u2",
        pokemonId: 2,
        pokemonName: "B",
        attackType: "normal",
        registeredAt: "2026-06-16T12:05:00.000Z",
        snapshot: {
          types: ["normal"],
          defenseEffectiveness: {},
          stats: makeStats(50),
        },
      },
    ],
  });

  const result = computeBruteRaidResult(state);

  expect(result).toEqual({
    success: true,
    missingStats: [],
    participantsCount: 2,
    teamStats: makeStats(110),
    statDiffs: { ...makeStats(10), hp: 0 },
  });
});

it("computeBruteRaidResult perd si une stat est égale au boss", () => {
  const state = makeState({
    defenders: [
      {
        userId: "u1",
        pokemonId: 1,
        pokemonName: "A",
        attackType: "normal",
        registeredAt: "2026-06-16T12:00:00.000Z",
        snapshot: {
          types: ["normal"],
          defenseEffectiveness: {},
          stats: {
            hp: 120,
            attack: 120,
            specialAttack: 120,
            defense: 120,
            specialDefense: 120,
            speed: 100,
          },
        },
      },
    ],
  });

  const result = computeBruteRaidResult(state);

  expect(result.success).toBe(false);
  expect(result.missingStats).toEqual(["speed"]);
  expect(result.teamStats.speed).toBe(100);
  expect(result.statDiffs.speed).toBe(0);
});

it("resolveRaid retourne une défaite complète si aucun défenseur n'est inscrit", () => {
  const state = makeState();

  const resolved = resolveRaid(state);

  expect(resolved.status).toBe("resolved");
  expect(resolved.resolvedAt).not.toBeNull();
  expect(resolved.result).toEqual({
    success: false,
    missingStats: [
      "attack",
      "specialAttack",
      "defense",
      "specialDefense",
      "speed",
    ],
    participantsCount: 0,
    teamStats: makeStats(0),
    statDiffs: makeStats(-100),
  });
});

it("resolveRaid lève une erreur si raidPokemon est absent", () => {
  const state = makeState({
    raidPokemon: null,
  });

  expect(() => resolveRaid(state)).toThrowError("No active raid boss.");
});

it("computeBruteRaidResult applique la faiblesse du défenseur sur sa defense (boss fire vs defender weak to fire)", () => {
  const state = makeState({
    defenders: [
      {
        userId: "u1",
        pokemonId: 1,
        pokemonName: "A",
        attackType: "normal",
        registeredAt: "2026-06-16T12:00:00.000Z",
        snapshot: {
          types: ["normal"],
          defenseEffectiveness: {
            fire: 2,
          },
          stats: {
            hp: 100,
            attack: 40,
            specialAttack: 30,
            defense: 20,
            specialDefense: 10,
            speed: 50,
          },
        },
      },
    ],
  });

  const result = computeBruteRaidResult(state);

  // defender weak to fire (2) → defense/2=10, specialDefense/2=5
  // boss has no defenseEffectiveness for "normal" → attack stays 40, specialAttack stays 30
  expect(result.teamStats).toEqual({
    hp: 100,
    attack: 40,
    specialAttack: 30,
    defense: 10,
    specialDefense: 5,
    speed: 50,
  });

  expect(result.success).toBe(false);
});

it("computeBruteRaidResult applique le multiplicateur d'attaque quand le boss est faible au type du défenseur", () => {
  const state = makeState({
    raidPokemon: {
      ...makeState().raidPokemon!,
      defenseEffectiveness: {
        grass: 2,
      },
    },
    defenders: [
      {
        userId: "u1",
        pokemonId: 1,
        pokemonName: "A",
        attackType: "grass",
        registeredAt: "2026-06-16T12:00:00.000Z",
        snapshot: {
          types: ["grass"],
          defenseEffectiveness: {},
          stats: {
            hp: 100,
            attack: 20,
            specialAttack: 30,
            defense: 40,
            specialDefense: 45,
            speed: 100,
          },
        },
      },
    ],
  });

  const result = computeBruteRaidResult(state);

  // boss weak to grass (2) → attack*2=40, specialAttack*2=60
  // defender has no weakness to fire → defense stays 40, specialDefense stays 45
  expect(result.teamStats).toEqual({
    hp: 100,
    attack: 40,
    specialAttack: 60,
    defense: 40,
    specialDefense: 45,
    speed: 100,
  });

  expect(result.success).toBe(false);
});

it("computeBruteRaidResult n'applique aucun bonus si le type n'existe pas dans defenseEffectiveness", () => {
  const state = makeState({
    defenders: [
      {
        userId: "u1",
        pokemonId: 1,
        pokemonName: "A",
        attackType: "electric",
        registeredAt: "2026-06-16T12:00:00.000Z",
        snapshot: {
          types: ["normal"],
          defenseEffectiveness: {},
          stats: {
            hp: 100,
            attack: 40,
            specialAttack: 30,
            defense: 20,
            specialDefense: 10,
            speed: 50,
          },
        },
      },
    ],
  });

  const result = computeBruteRaidResult(state);

  expect(result.teamStats).toEqual({
    hp: 100,
    attack: 40,
    specialAttack: 30,
    defense: 20,
    specialDefense: 10,
    speed: 50,
  });
});