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
  DEFAULT_METHOD_DIFFICULTY,
} from "./rarityScoring";

// ---- fixture helpers -------------------------------------------------

function encounterEntry(
  versionName: string,
  method: string,
  chance?: number,
) {
  const detail: any = { method: { name: method } };
  if (chance !== undefined) detail.chance = chance;
  return {
    version_details: [
      {
        version: { name: versionName },
        encounter_details: [detail],
      },
    ],
  };
}

function multiMethodEntry(
  versionName: string,
  methodsWithChance: { method: string; chance?: number }[],
) {
  return {
    version_details: [
      {
        version: { name: versionName },
        encounter_details: methodsWithChance.map(({ method, chance }) => {
          const detail: any = { method: { name: method } };
          if (chance !== undefined) detail.chance = chance;
          return detail;
        }),
      },
    ],
  };
}

// ---- isOneTimeOnly -----------------------------------------------------

describe("isOneTimeOnly", () => {
  it("returns false for a non-array input", () => {
    expect(isOneTimeOnly(null as any)).toBe(false);
    expect(isOneTimeOnly(undefined as any)).toBe(false);
    expect(isOneTimeOnly({} as any)).toBe(false);
  });

  it("returns false for empty encounters", () => {
    expect(isOneTimeOnly([])).toBe(false);
  });

  it("Pikachu-like case: gift entry plus a wild method elsewhere returns false", () => {
    const encounters = [
      encounterEntry("yellow", "gift"),
      encounterEntry("red", "walk", 45),
    ];
    expect(isOneTimeOnly(encounters)).toBe(false);
  });

  it("starter-like case: only gift entries across all encounters returns true", () => {
    const encounters = [
      encounterEntry("red", "gift"),
      encounterEntry("blue", "gift"),
    ];
    expect(isOneTimeOnly(encounters)).toBe(true);
  });

  it("returns true when the only method is gift-egg", () => {
    const encounters = [encounterEntry("scarlet", "gift-egg")];
    expect(isOneTimeOnly(encounters)).toBe(true);
  });

  it("returns true when gift and gift-egg are mixed but no other method appears", () => {
    const encounters = [
      encounterEntry("red", "gift"),
      encounterEntry("blue", "gift-egg"),
    ];
    expect(isOneTimeOnly(encounters)).toBe(true);
  });

  it("returns false when no gift/gift-egg method is present at all", () => {
    const encounters = [encounterEntry("red", "walk", 45)];
    expect(isOneTimeOnly(encounters)).toBe(false);
  });

  it("returns false when gift is present alongside a rod method in a different location", () => {
    const encounters = [
      encounterEntry("emerald", "gift"),
      encounterEntry("emerald", "old-rod", 10),
    ];
    expect(isOneTimeOnly(encounters)).toBe(false);
  });
});

// ---- computeEncounterRateComponent -------------------------------------

describe("computeEncounterRateComponent", () => {
  it("returns 100 when no numeric chance is found anywhere", () => {
    const encounters = [encounterEntry("red", "gift")];
    expect(computeEncounterRateComponent(encounters)).toBe(100);
  });

  it("returns 100 for an empty/undefined encounters list", () => {
    expect(computeEncounterRateComponent([])).toBe(100);
    expect(computeEncounterRateComponent(undefined as any)).toBe(100);
  });

  it("returns 100 minus the highest chance found across all entries", () => {
    const encounters = [
      encounterEntry("red", "walk", 20),
      encounterEntry("blue", "walk", 60),
    ];
    expect(computeEncounterRateComponent(encounters)).toBe(40);
  });

  it("clamps to 0 when the max chance is 100", () => {
    const encounters = [encounterEntry("red", "walk", 100)];
    expect(computeEncounterRateComponent(encounters)).toBe(0);
  });
});

// ---- computeGamesComponent ----------------------------------------------

describe("computeGamesComponent", () => {
  it("returns 100 when the Pokémon appears in no games", () => {
    expect(computeGamesComponent([])).toBe(100);
  });

  it("returns 0 when the Pokémon appears in REFERENCE_MAX_GAMES distinct games", () => {
    const encounters = Array.from({ length: REFERENCE_MAX_GAMES }, (_, i) =>
      encounterEntry(`game-${i}`, "walk", 10),
    );
    expect(computeGamesComponent(encounters)).toBe(0);
  });

  it("returns a proportional value for half of REFERENCE_MAX_GAMES", () => {
    const half = REFERENCE_MAX_GAMES / 2;
    const encounters = Array.from({ length: half }, (_, i) =>
      encounterEntry(`game-${i}`, "walk", 10),
    );
    expect(computeGamesComponent(encounters)).toBe(50);
  });

  it("counts distinct version names only once even if repeated across locations", () => {
    const encounters = [
      encounterEntry("red", "walk", 10),
      encounterEntry("red", "surf", 5),
    ];
    // Only 1 distinct version => 100 - (1/12)*100
    expect(computeGamesComponent(encounters)).toBeCloseTo(100 - (1 / REFERENCE_MAX_GAMES) * 100);
  });
});

// ---- computeMethodComponent ----------------------------------------------

describe("computeMethodComponent", () => {
  it("returns DEFAULT_METHOD_DIFFICULTY when there are no methods at all", () => {
    expect(computeMethodComponent([])).toBe(DEFAULT_METHOD_DIFFICULTY);
  });

  it("returns 0 when a walk/grass method is available", () => {
    const encounters = [encounterEntry("red", "walk")];
    expect(computeMethodComponent(encounters)).toBe(0);
  });

  it("returns 100 when the only method is gift", () => {
    const encounters = [encounterEntry("red", "gift")];
    expect(computeMethodComponent(encounters)).toBe(100);
  });

  it("picks the easiest (lowest difficulty) method when several are available", () => {
    const encounters = [
      multiMethodEntry("red", [{ method: "gift" }, { method: "surf" }, { method: "walk" }]),
    ];
    expect(computeMethodComponent(encounters)).toBe(0);
  });

  it("falls back to DEFAULT_METHOD_DIFFICULTY for an unrecognized method", () => {
    const encounters = [encounterEntry("red", "some-unknown-method")];
    expect(computeMethodComponent(encounters)).toBe(DEFAULT_METHOD_DIFFICULTY);
  });
});

// ---- computeExclusivityComponent ------------------------------------------

describe("computeExclusivityComponent", () => {
  it("returns 100 when available in 0 games", () => {
    expect(computeExclusivityComponent([])).toBe(100);
  });

  it("returns 100 when available in exactly 1 game", () => {
    const encounters = [encounterEntry("red", "walk", 10)];
    expect(computeExclusivityComponent(encounters)).toBe(100);
  });

  it("returns 75 when available in exactly 2 games", () => {
    const encounters = [
      encounterEntry("red", "walk", 10),
      encounterEntry("blue", "walk", 10),
    ];
    expect(computeExclusivityComponent(encounters)).toBe(75);
  });

  it("clamps to 0 when available in 5 or more games", () => {
    const encounters = Array.from({ length: 5 }, (_, i) =>
      encounterEntry(`game-${i}`, "walk", 10),
    );
    expect(computeExclusivityComponent(encounters)).toBe(0);
  });
});

// ---- computeEvolutionComponent --------------------------------------------

describe("computeEvolutionComponent", () => {
  it("returns 0 when there is no chain at all", () => {
    expect(computeEvolutionComponent(undefined as any, "bulbasaur")).toBe(0);
    expect(computeEvolutionComponent({ chain: undefined } as any, "bulbasaur")).toBe(0);
  });

  it("returns 0 when the species is not found in the chain", () => {
    const chain = {
      chain: {
        species: { name: "bulbasaur" },
        evolution_details: [],
        evolves_to: [],
      },
    };
    expect(computeEvolutionComponent(chain as any, "charmander")).toBe(0);
  });

  it("returns 0 for the base form (depth 0)", () => {
    const chain = {
      chain: {
        species: { name: "bulbasaur" },
        evolution_details: [],
        evolves_to: [],
      },
    };
    expect(computeEvolutionComponent(chain as any, "bulbasaur")).toBe(0);
  });

  it("returns 30 for a depth-1 evolution triggered by level-up", () => {
    const chain = {
      chain: {
        species: { name: "bulbasaur" },
        evolution_details: [],
        evolves_to: [
          {
            species: { name: "ivysaur" },
            evolution_details: [{ trigger: { name: "level-up" } }],
            evolves_to: [],
          },
        ],
      },
    };
    expect(computeEvolutionComponent(chain as any, "ivysaur")).toBe(30);
  });

  it("returns 45 for a depth-1 evolution triggered by use-item", () => {
    const chain = {
      chain: {
        species: { name: "poliwag" },
        evolution_details: [],
        evolves_to: [
          {
            species: { name: "poliwhirl" },
            evolution_details: [{ trigger: { name: "use-item" } }],
            evolves_to: [],
          },
        ],
      },
    };
    expect(computeEvolutionComponent(chain as any, "poliwhirl")).toBe(45);
  });

  it("returns 55 for a depth-1 evolution triggered by trade", () => {
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
    expect(computeEvolutionComponent(chain as any, "machoke")).toBe(55);
  });

  it("uses the default trigger bonus when the trigger name is unrecognized", () => {
    const chain = {
      chain: {
        species: { name: "eevee" },
        evolution_details: [],
        evolves_to: [
          {
            species: { name: "vaporeon" },
            evolution_details: [{ trigger: { name: "some-weird-trigger" } }],
            evolves_to: [],
          },
        ],
      },
    };
    expect(computeEvolutionComponent(chain as any, "vaporeon")).toBe(55);
  });

  it("uses the default trigger bonus when trigger name is missing entirely", () => {
    const chain = {
      chain: {
        species: { name: "eevee" },
        evolution_details: [],
        evolves_to: [
          {
            species: { name: "vaporeon" },
            evolution_details: [{}],
            evolves_to: [],
          },
        ],
      },
    };
    expect(computeEvolutionComponent(chain as any, "vaporeon")).toBe(55);
  });

  it("clamps depth contribution at depth 2 for deeper chains", () => {
    const chain = {
      chain: {
        species: { name: "caterpie" },
        evolution_details: [],
        evolves_to: [
          {
            species: { name: "metapod" },
            evolution_details: [{ trigger: { name: "level-up" } }],
            evolves_to: [
              {
                species: { name: "butterfree" },
                evolution_details: [{ trigger: { name: "level-up" } }],
                evolves_to: [],
              },
            ],
          },
        ],
      },
    };
    // depth = 2 => Math.min(2,2)*30 = 60, trigger level-up bonus = 0
    expect(computeEvolutionComponent(chain as any, "butterfree")).toBe(60);
  });
});

// ---- computeOneTimeOnlyComponent -------------------------------------------

describe("computeOneTimeOnlyComponent", () => {
  it("returns 100 when isOneTimeOnly would be true (gift-only encounters)", () => {
    const encounters = [encounterEntry("red", "gift")];
    expect(computeOneTimeOnlyComponent(encounters)).toBe(100);
  });

  it("returns 0 when isOneTimeOnly would be false (gift + wild method present)", () => {
    const encounters = [
      encounterEntry("yellow", "gift"),
      encounterEntry("red", "walk", 45),
    ];
    expect(computeOneTimeOnlyComponent(encounters)).toBe(0);
  });
});

// ---- mapScoreToRarityTier ---------------------------------------------------

describe("mapScoreToRarityTier", () => {
  it("maps a score at the common boundary (15) to common", () => {
    expect(mapScoreToRarityTier(15)).toBe("common");
  });

  it("maps a score just above the common boundary to uncommon", () => {
    expect(mapScoreToRarityTier(15.01)).toBe("uncommon");
  });

  it("maps a score at the uncommon boundary (30) to uncommon", () => {
    expect(mapScoreToRarityTier(30)).toBe("uncommon");
  });

  it("maps a score just above the uncommon boundary to rare", () => {
    expect(mapScoreToRarityTier(30.01)).toBe("rare");
  });

  it("maps a score at the rare boundary (45) to rare", () => {
    expect(mapScoreToRarityTier(45)).toBe("rare");
  });

  it("maps a score just above the rare boundary to very_rare", () => {
    expect(mapScoreToRarityTier(45.01)).toBe("very_rare");
  });

  it("maps a score at the very_rare boundary (60) to very_rare", () => {
    expect(mapScoreToRarityTier(60)).toBe("very_rare");
  });

  it("maps a score just above the very_rare boundary to epic", () => {
    expect(mapScoreToRarityTier(60.01)).toBe("epic");
  });

  it("maps a score at the epic boundary (75) to epic", () => {
    expect(mapScoreToRarityTier(75)).toBe("epic");
  });

  it("maps a score just above the epic boundary to ultra_rare", () => {
    expect(mapScoreToRarityTier(75.01)).toBe("ultra_rare");
  });

  it("maps a score at the ultra_rare boundary (100) to ultra_rare", () => {
    expect(mapScoreToRarityTier(100)).toBe("ultra_rare");
  });

  it("falls back to ultra_rare for a score above every threshold", () => {
    expect(mapScoreToRarityTier(150)).toBe("ultra_rare");
  });

  it("maps a score of 0 to common", () => {
    expect(mapScoreToRarityTier(0)).toBe("common");
  });
});

// ---- applyEpicFloor ----------------------------------------------------------

describe("applyEpicFloor", () => {
  it("leaves the tier untouched when oneTimeOnly is false, even for a low tier", () => {
    expect(applyEpicFloor("common", false)).toBe("common");
  });

  it("floors common up to epic when oneTimeOnly is true", () => {
    expect(applyEpicFloor("common", true)).toBe("epic");
  });

  it("floors uncommon up to epic when oneTimeOnly is true", () => {
    expect(applyEpicFloor("uncommon", true)).toBe("epic");
  });

  it("floors rare up to epic when oneTimeOnly is true", () => {
    expect(applyEpicFloor("rare", true)).toBe("epic");
  });

  it("floors very_rare up to epic when oneTimeOnly is true", () => {
    expect(applyEpicFloor("very_rare", true)).toBe("epic");
  });

  it("leaves epic untouched when already at epic and oneTimeOnly is true", () => {
    expect(applyEpicFloor("epic", true)).toBe("epic");
  });

  it("leaves ultra_rare untouched when already above epic and oneTimeOnly is true", () => {
    expect(applyEpicFloor("ultra_rare", true)).toBe("ultra_rare");
  });

  it("leaves legendary untouched when already above epic and oneTimeOnly is true", () => {
    expect(applyEpicFloor("legendary", true)).toBe("legendary");
  });
});
