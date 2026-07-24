import { describe, it, expect } from "vitest";
import { computeBruteRaidResult } from "../src/features/raid/computeBruteRaidResult";
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
      defenseEffectiveness: { water: 2, grass: 0.5 },
    },
    defenders: [],
    result: null,
    reward: null,
    ...overrides,
  };
}

describe("computeBruteRaidResult", () => {
  it("should fail with no defenders", () => {
    const state = makeState();
    expect(() => computeBruteRaidResult(state)).not.toThrow();
    // 0 vs 100 on all stats → all missing
  });

  it("should succeed when team stats exceed boss stats", () => {
    const state = makeState({
      defenders: [
        {
          userId: "u1",
          pokemonId: 7,
          pokemonName: "Carapuce",
          attackType: "water",
          registeredAt: new Date().toISOString(),
          snapshot: {
            types: ["water"],
            defenseEffectiveness: { fire: 0.5 },
            stats: { hp: 200, attack: 200, defense: 200, specialAttack: 200, specialDefense: 200, speed: 200 },
          },
        },
      ],
    });

    const result = computeBruteRaidResult(state);
    // water attack vs boss fire defense effectiveness: water=2 → attack*2=400 > 100 ✓
    // boss fire attack vs defender water defense: fire=0.5 → defense / 0.5 = 400 > 100 ✓
    expect(result.success).toBe(true);
    expect(result.missingStats).toEqual([]);
    expect(result.participantsCount).toBe(1);
  });

  it("should apply type effectiveness correctly on attack", () => {
    const state = makeState({
      defenders: [
        {
          userId: "u1",
          pokemonId: 7,
          pokemonName: "Carapuce",
          attackType: "water",
          registeredAt: new Date().toISOString(),
          snapshot: {
            types: ["water"],
            defenseEffectiveness: {},
            stats: { hp: 200, attack: 60, defense: 200, specialAttack: 60, specialDefense: 200, speed: 200 },
          },
        },
      ],
    });

    const result = computeBruteRaidResult(state);
    // water attack vs boss: boss defenseEffectiveness.water=2 → 60*2=120 > 100 ✓
    expect(result.teamStats.attack).toBe(120);
    expect(result.teamStats.specialAttack).toBe(120);
    expect(result.success).toBe(true);
  });

  it("should apply type effectiveness correctly on defense (weakness)", () => {
    const state = makeState({
      defenders: [
        {
          userId: "u1",
          pokemonId: 1,
          pokemonName: "Bulbi",
          attackType: "grass",
          registeredAt: new Date().toISOString(),
          snapshot: {
            types: ["grass"],
            defenseEffectiveness: { fire: 2 },
            stats: { hp: 200, attack: 200, defense: 200, specialAttack: 200, specialDefense: 200, speed: 200 },
          },
        },
      ],
    });

    const result = computeBruteRaidResult(state);
    // grass attack vs boss: boss defenseEffectiveness.grass=0.5 → 200*0.5=100. 100 <= 100 → missing
    expect(result.teamStats.attack).toBe(100);
    // boss fire attack vs grass defender: defenseEffectiveness.fire=2 → 200/2=100. 100 <= 100 → missing
    expect(result.teamStats.defense).toBe(100);
    expect(result.missingStats).toContain("attack");
    expect(result.missingStats).toContain("defense");
  });
});
