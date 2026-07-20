import { describe, it, expect } from "vitest";
import {
  isOneTimeOnly,
  computeEncounterRateComponent,
  computeGamesComponent,
  computeMethodComponent,
  computeExclusivityComponent,
  computeEvolutionComponent,
  computeOneTimeOnlyComponent,
  mapScoreToRarityTier,
  applyEpicFloor,
  REFERENCE_MAX_GAMES,
} from "./rarityScoring";

// Helper to build a minimal PokéAPI-like encounters structure.
function makeEncounters(
  entries: {
    version?: string;
    method?: string;
    chance?: number;
  }[],
): any[] {
  return [
    {
      location_area: { name: "test-area" },
      version_details: entries.map((e) => ({
        version: e.version ? { name: e.version } : undefined,
        encounter_details: [
          {
            chance: e.chance,
            method: e.method ? { name: e.method } : undefined,
          },
        ],
      })),
    },
  ];
}

describe("isOneTimeOnly", () => {
  it("returns true when a 'gift' method is present", () => {
    const encounters = makeEncounters([{ version: "red", method: "gift" }]);
    expect(isOneTimeOnly(encounters)).toBe(true);
  });

  it("returns true when a 'gift-egg' method is present", () => {
    const encounters = makeEncounters([
      { version: "red", method: "gift-egg" },
    ]);
    expect(isOneTimeOnly(encounters)).toBe(true);
  });

  it("returns false when neither gift nor gift-egg is present", () => {
    const encounters = makeEncounters([{ version: "red", method: "walk" }]);
    expect(isOneTimeOnly(encounters)).toBe(false);
  });

  it("returns false for empty/missing structure", () => {
    expect(isOneTimeOnly([])).toBe(false);
    expect(isOneTimeOnly(undefined as any)).toBe(false);
    expect(isOneTimeOnly(null as any)).toBe(false);
  });
});

describe("computeEncounterRateComponent", () => {
  it("returns 100 when no numeric chance field exists anywhere", () => {
    const encounters = makeEncounters([{ version: "red", method: "gift" }]);
    expect(computeEncounterRateComponent(encounters)).toBe(100);
  });

  it("returns 100 for a completely empty encounters array", () => {
    expect(computeEncounterRateComponent([])).toBe(100);
  });

  it("takes the max chance across multiple nested entries", () => {
    const encounters: any[] = [
      {
        version_details: [
          {
            version: { name: "red" },
            encounter_details: [{ chance: 10, method: { name: "walk" } }],
          },
        ],
      },
      {
        version_details: [
          {
            version: { name: "blue" },
            encounter_details: [
              { chance: 45, method: { name: "walk" } },
              { chance: 20, method: { name: "surf" } },
            ],
          },
        ],
      },
    ];
    // max chance is 45 -> 100 - 45 = 55
    expect(computeEncounterRateComponent(encounters)).toBe(55);
  });

  it("clamps to 100 when chance is 0", () => {
    const encounters = makeEncounters([{ chance: 0, method: "walk" }]);
    expect(computeEncounterRateComponent(encounters)).toBe(100);
  });

  it("clamps to 0 when chance is >= 100", () => {
    const encounters = makeEncounters([{ chance: 100, method: "walk" }]);
    expect(computeEncounterRateComponent(encounters)).toBe(0);
  });
});

describe("computeGamesComponent", () => {
  it("returns 100 for 0 distinct games", () => {
    expect(computeGamesComponent([])).toBe(100);
  });

  it("computes the component for 1 distinct game", () => {
    const encounters = makeEncounters([{ version: "red", method: "walk" }]);
    const expected = 100 - (1 / REFERENCE_MAX_GAMES) * 100;
    expect(computeGamesComponent(encounters)).toBeCloseTo(expected);
  });

  it("computes the component for several distinct games", () => {
    const encounters = makeEncounters([
      { version: "red", method: "walk" },
      { version: "blue", method: "walk" },
      { version: "yellow", method: "walk" },
    ]);
    const expected = 100 - (3 / REFERENCE_MAX_GAMES) * 100;
    expect(computeGamesComponent(encounters)).toBeCloseTo(expected);
  });

  it("clamps to 0 at REFERENCE_MAX_GAMES or more distinct games", () => {
    const versions = Array.from(
      { length: REFERENCE_MAX_GAMES },
      (_, i) => `game-${i}`,
    );
    const encounters = makeEncounters(
      versions.map((v) => ({ version: v, method: "walk" })),
    );
    expect(computeGamesComponent(encounters)).toBe(0);

    const moreVersions = Array.from(
      { length: REFERENCE_MAX_GAMES + 3 },
      (_, i) => `game-${i}`,
    );
    const moreEncounters = makeEncounters(
      moreVersions.map((v) => ({ version: v, method: "walk" })),
    );
    expect(computeGamesComponent(moreEncounters)).toBe(0);
  });
});

describe("computeMethodComponent", () => {
  it("returns DEFAULT_METHOD_DIFFICULTY when no methods are found", () => {
    expect(computeMethodComponent([])).toBe(60);
  });

  it("takes the minimum (easiest) difficulty across multiple methods", () => {
    const encounters = makeEncounters([
      { version: "red", method: "surf" }, // 40
      { version: "blue", method: "walk" }, // 0
      { version: "yellow", method: "gift" }, // 100
    ]);
    expect(computeMethodComponent(encounters)).toBe(0);
  });

  it("does not simply take the first or last method listed", () => {
    const encounters = makeEncounters([
      { version: "red", method: "trade" }, // 100
      { version: "blue", method: "surf" }, // 40 (middle, but the min)
      { version: "yellow", method: "gift-egg" }, // 100
    ]);
    expect(computeMethodComponent(encounters)).toBe(40);
  });

  it("falls back to DEFAULT_METHOD_DIFFICULTY for an unknown method name", () => {
    const encounters = makeEncounters([
      { version: "red", method: "totally-unknown-method" },
    ]);
    expect(computeMethodComponent(encounters)).toBe(60);
  });
});

describe("computeExclusivityComponent", () => {
  it("returns 100 for a single distinct version", () => {
    const encounters = makeEncounters([{ version: "red", method: "walk" }]);
    expect(computeExclusivityComponent(encounters)).toBe(100);
  });

  it("returns 75 for two distinct versions", () => {
    const encounters = makeEncounters([
      { version: "red", method: "walk" },
      { version: "blue", method: "walk" },
    ]);
    expect(computeExclusivityComponent(encounters)).toBe(75);
  });

  it("returns 50 for three distinct versions", () => {
    const encounters = makeEncounters([
      { version: "red", method: "walk" },
      { version: "blue", method: "walk" },
      { version: "yellow", method: "walk" },
    ]);
    expect(computeExclusivityComponent(encounters)).toBe(50);
  });

  it("clamps to 0 floor when enough versions are present", () => {
    const versions = Array.from({ length: 6 }, (_, i) => `game-${i}`);
    const encounters = makeEncounters(
      versions.map((v) => ({ version: v, method: "walk" })),
    );
    // (6 - 1) * 25 = 125 -> clamped to 0
    expect(computeExclusivityComponent(encounters)).toBe(0);
  });
});

describe("computeEvolutionComponent", () => {
  const threeStageChain = {
    chain: {
      species: { name: "bulbasaur" },
      evolution_details: [],
      evolves_to: [
        {
          species: { name: "ivysaur" },
          evolution_details: [{ trigger: { name: "level-up" } }],
          evolves_to: [
            {
              species: { name: "venusaur" },
              evolution_details: [{ trigger: { name: "level-up" } }],
              evolves_to: [],
            },
          ],
        },
      ],
    },
  };

  it("returns 0 for the root species (depth 0)", () => {
    expect(computeEvolutionComponent(threeStageChain, "bulbasaur")).toBe(0);
  });

  it("computes depth-1 with a 'level-up' trigger (bonus 0)", () => {
    // depth 1 -> depthComponent = 30, trigger level-up -> bonus 0
    expect(computeEvolutionComponent(threeStageChain, "ivysaur")).toBe(30);
  });

  it("computes depth-1 with a 'use-item' trigger (bonus 15)", () => {
    const chain = {
      chain: {
        species: { name: "pichu" },
        evolution_details: [],
        evolves_to: [
          {
            species: { name: "pikachu" },
            evolution_details: [{ trigger: { name: "use-item" } }],
            evolves_to: [],
          },
        ],
      },
    };
    expect(computeEvolutionComponent(chain, "pikachu")).toBe(45);
  });

  it("computes depth-1 with a 'trade' trigger (bonus 25)", () => {
    const chain = {
      chain: {
        species: { name: "machop" },
        evolution_details: [],
        evolves_to: [
          {
            species: { name: "machoke" },
            evolution_details: [{ trigger: { name: "trade" } }],
            evolves_to: [],
          },
        ],
      },
    };
    expect(computeEvolutionComponent(chain, "machoke")).toBe(55);
  });

  it("computes depth-1 with an 'anything else' trigger (default bonus 25)", () => {
    const chain = {
      chain: {
        species: { name: "poliwag" },
        evolution_details: [],
        evolves_to: [
          {
            species: { name: "poliwhirl" },
            evolution_details: [{ trigger: { name: "shed" } }],
            evolves_to: [],
          },
        ],
      },
    };
    expect(computeEvolutionComponent(chain, "poliwhirl")).toBe(55);
  });

  it("accumulates depth for a depth-2 species in a 3-stage chain (capped at depth 2)", () => {
    // depth 2 -> depthComponent = min(2, 2) * 30 = 60, trigger level-up -> bonus 0
    expect(computeEvolutionComponent(threeStageChain, "venusaur")).toBe(60);
  });

  it("returns 0 when the species is not present anywhere in the chain", () => {
    expect(computeEvolutionComponent(threeStageChain, "charizard")).toBe(0);
  });

  it("returns 0 when the evolution chain is undefined", () => {
    expect(computeEvolutionComponent(undefined as any, "bulbasaur")).toBe(0);
  });

  it("returns 0 when the evolution chain is null", () => {
    expect(computeEvolutionComponent(null as any, "bulbasaur")).toBe(0);
  });
});

describe("computeOneTimeOnlyComponent", () => {
  it("returns 100 when the encounters are one-time-only", () => {
    const encounters = makeEncounters([{ version: "red", method: "gift" }]);
    expect(computeOneTimeOnlyComponent(encounters)).toBe(100);
  });

  it("returns 0 when the encounters are not one-time-only", () => {
    const encounters = makeEncounters([{ version: "red", method: "walk" }]);
    expect(computeOneTimeOnlyComponent(encounters)).toBe(0);
  });
});

describe("mapScoreToRarityTier", () => {
  it("maps a score of exactly 15 to 'common' (upper-bound inclusive)", () => {
    expect(mapScoreToRarityTier(15)).toBe("common");
  });

  it("maps a score of 15.01 to 'uncommon'", () => {
    expect(mapScoreToRarityTier(15.01)).toBe("uncommon");
  });

  it("maps a score of 16 to 'uncommon'", () => {
    expect(mapScoreToRarityTier(16)).toBe("uncommon");
  });

  it("maps a score of exactly 75 to 'epic'", () => {
    expect(mapScoreToRarityTier(75)).toBe("epic");
  });

  it("maps a score of 76 to 'ultra_rare'", () => {
    expect(mapScoreToRarityTier(76)).toBe("ultra_rare");
  });

  it("maps a score of exactly 100 to 'ultra_rare'", () => {
    expect(mapScoreToRarityTier(100)).toBe("ultra_rare");
  });

  it("maps a score above 100 to 'ultra_rare' (no internal clamping needed since it falls through the loop)", () => {
    expect(mapScoreToRarityTier(150)).toBe("ultra_rare");
  });

  it("maps a negative score to 'common' (first threshold satisfied, no internal clamping)", () => {
    expect(mapScoreToRarityTier(-10)).toBe("common");
  });
});

describe("applyEpicFloor", () => {
  it("upgrades a tier below epic to 'epic' when oneTimeOnly is true", () => {
    expect(applyEpicFloor("common", true)).toBe("epic");
    expect(applyEpicFloor("rare", true)).toBe("epic");
  });

  it("leaves 'epic' unchanged when oneTimeOnly is true (no further upgrade)", () => {
    expect(applyEpicFloor("epic", true)).toBe("epic");
  });

  it("does not downgrade a tier above epic when oneTimeOnly is true", () => {
    expect(applyEpicFloor("ultra_rare", true)).toBe("ultra_rare");
  });

  it("leaves the tier unchanged regardless of value when oneTimeOnly is false", () => {
    expect(applyEpicFloor("common", false)).toBe("common");
    expect(applyEpicFloor("epic", false)).toBe("epic");
    expect(applyEpicFloor("ultra_rare", false)).toBe("ultra_rare");
  });
});
