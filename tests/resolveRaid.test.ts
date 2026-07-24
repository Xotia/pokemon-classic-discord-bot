import { describe, it, expect } from "vitest";
import { resolveRaid } from "../src/features/raid/resolveRaid";
import { RaidState } from "../src/types/raid/RaidState";

function makeState(overrides: Partial<RaidState> = {}): RaidState {
  return {
    raidId: "test",
    status: "registration",
    createdAt: null,
    registrationOpensAt: null,
    registrationClosesAt: null,
    resolvedAt: null,
    generation: 1,
    zone: "test-zone",
    raidPokemon: {
      id: 1,
      name: "Boss",
      zone: "test-zone",
      types: ["fire"],
      attackType: "fire",
      difficulty: 2,
      baseStats: { hp: 50, attack: 50, defense: 50, specialAttack: 50, specialDefense: 50, speed: 50 },
      finalStats: { hp: 100, attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      defenseEffectiveness: {},
    },
    defenders: [],
    result: null,
    reward: null,
    ...overrides,
  };
}

describe("resolveRaid", () => {
  it("fails with no defenders", () => {
    const result = resolveRaid(makeState());
    expect(result.status).toBe("resolved");
    expect(result.result?.success).toBe(false);
    expect(result.result?.participantsCount).toBe(0);
  });

  it("throws without raidPokemon", () => {
    expect(() => resolveRaid(makeState({ raidPokemon: null }))).toThrow();
  });

  it("resolves with defenders", () => {
    const state = makeState({
      defenders: [{
        userId: "u1",
        pokemonId: 7,
        pokemonName: "Test",
        attackType: "water",
        registeredAt: new Date().toISOString(),
        snapshot: {
          types: ["water"],
          defenseEffectiveness: {},
          stats: { hp: 200, attack: 200, defense: 200, specialAttack: 200, specialDefense: 200, speed: 200 },
        },
      }],
    });
    const result = resolveRaid(state);
    expect(result.status).toBe("resolved");
    expect(result.result?.success).toBe(true);
  });
});
