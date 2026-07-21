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
  applyOneTimeOnlyChainFloor,
  getMaxEncounterChance,
  getDistinctVersionNames,
  getDistinctLocationVersionPairs,
  getDistinctMethods,
  getEasiestMethod,
  getEvolutionInfo,
  getParentSpeciesId,
  REFERENCE_MAX_AVAILABILITY,
  DEFAULT_METHOD_DIFFICULTY,
  filterEncountersToVersions,
  GEN3_VERSIONS,
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

function locationEncounterEntry(
  locationName: string,
  versionName: string,
  method: string,
  chance?: number,
) {
  const detail: any = { method: { name: method } };
  if (chance !== undefined) detail.chance = chance;
  return {
    location_area: { name: locationName },
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

  it("scales the highest chance found across all entries against REFERENCE_MAX_CHANCE, clamping at 0 once it's reached", () => {
    const encounters = [
      encounterEntry("red", "walk", 20),
      encounterEntry("blue", "walk", 60),
    ];
    // max chance = 60, which is already above REFERENCE_MAX_CHANCE (50):
    // clamp(100 - (60/50)*100, 0, 100) = clamp(-20, 0, 100) = 0.
    expect(computeEncounterRateComponent(encounters)).toBe(0);
  });

  it("clamps to 0 when the max chance is 100", () => {
    const encounters = [encounterEntry("red", "walk", 100)];
    expect(computeEncounterRateComponent(encounters)).toBe(0);
  });

  it("devon-scope-only regression: uses the fixed-method chance as-is (not the 'nothing found' fallback) when no genuine wild entry exists anywhere", () => {
    // No genuine (non-fixed) wild entry exists anywhere in this fixture, so
    // devon-scope is NOT excluded — there's nothing else to fall back on.
    // Grouped sum = 6 x 100 = 600, capped at 100 => clamp(100 - (100/50)*100, 0, 100) = 0.
    const encounters = [
      {
        location_area: { name: "route-120-area" },
        version_details: [
          {
            version: { name: "ruby" },
            encounter_details: [
              { method: { name: "devon-scope" }, chance: 100 },
              { method: { name: "devon-scope" }, chance: 100 },
              { method: { name: "devon-scope" }, chance: 100 },
              { method: { name: "devon-scope" }, chance: 100 },
              { method: { name: "devon-scope" }, chance: 100 },
              { method: { name: "devon-scope" }, chance: 100 },
            ],
          },
        ],
      },
    ];
    expect(computeEncounterRateComponent(encounters)).toBe(0);
  });

  it("starter-like gift-only case: uses the gift chance as-is, not the 'nothing found' fallback that previously inflated starters to ultra_rare", () => {
    // A starter's sole "gift" encounter with an explicit 100% chance and no
    // other data at all: must be scored on its own 100% chance (=> C1 = 0),
    // not treated as "nothing found" (=> C1 = 100), which was the bug that
    // pushed gift-only starters from epic to ultra_rare.
    const encounters = [encounterEntry("red", "gift", 100)];
    // clamp(100 - (100/50)*100, 0, 100) = 0.
    expect(computeEncounterRateComponent(encounters)).toBe(0);
  });

  it("Kecleon mixed case: bases the score on the genuine wild method's chance, ignoring a much higher devon-scope chance", () => {
    const encounters = [
      // Genuine wild grass encounter: 1% chance => component should be 98
      // (scaled against REFERENCE_MAX_CHANCE, not a flat 100).
      locationEncounterEntry("route-119-area", "ruby", "walk", 1),
      // Guaranteed devon-scope trigger elsewhere: must not lower the score
      // down toward 0 as if the species were common.
      {
        location_area: { name: "route-120-area" },
        version_details: [
          {
            version: { name: "ruby" },
            encounter_details: [{ method: { name: "devon-scope" }, chance: 100 }],
          },
        ],
      },
    ];
    // chance = 1: clamp(100 - (1/50)*100, 0, 100) = 98.
    expect(computeEncounterRateComponent(encounters)).toBe(98);
  });

  it("Route 103 Poochyena regression: sums chances within the same location+version+method group instead of taking the max slot", () => {
    // PokéAPI splits one spawn table into several level-range slots that
    // all share the same location_area/version/method — these must be
    // summed (60), not compared for a max (which would wrongly give 20).
    const encounters = [
      {
        location_area: { name: "route-103-area" },
        version_details: [
          {
            version: { name: "emerald" },
            encounter_details: [
              { method: { name: "walk" }, chance: 20 },
              { method: { name: "walk" }, chance: 20 },
              { method: { name: "walk" }, chance: 10 },
              { method: { name: "walk" }, chance: 10 },
            ],
          },
        ],
      },
    ];
    // grouped sum = 60, which is above REFERENCE_MAX_CHANCE (50):
    // clamp(100 - (60/50)*100, 0, 100) = clamp(-20, 0, 100) = 0.
    expect(computeEncounterRateComponent(encounters)).toBe(0);
  });

  it("returns exactly 0 when the max chance equals REFERENCE_MAX_CHANCE (50)", () => {
    const encounters = [encounterEntry("red", "walk", 50)];
    // clamp(100 - (50/50)*100, 0, 100) = clamp(0, 0, 100) = 0.
    expect(computeEncounterRateComponent(encounters)).toBe(0);
  });

  it("stays clamped at 0 (not negative) when the max chance is well above REFERENCE_MAX_CHANCE", () => {
    const encounters = [encounterEntry("red", "walk", 60)];
    // clamp(100 - (60/50)*100, 0, 100) = clamp(-20, 0, 100) = 0.
    expect(computeEncounterRateComponent(encounters)).toBe(0);
  });

  it("scales proportionally against REFERENCE_MAX_CHANCE for a chance well below it", () => {
    const encounters = [encounterEntry("red", "walk", 10)];
    // clamp(100 - (10/50)*100, 0, 100) = clamp(80, 0, 100) = 80.
    expect(computeEncounterRateComponent(encounters)).toBe(80);
  });
});

// ---- computeGamesComponent ----------------------------------------------

describe("computeGamesComponent", () => {
  it("returns 100 when pairsCount is 0 (nothing available = rarest)", () => {
    expect(computeGamesComponent(0)).toBe(100);
  });

  it("returns 0 when pairsCount equals REFERENCE_MAX_AVAILABILITY", () => {
    expect(computeGamesComponent(REFERENCE_MAX_AVAILABILITY)).toBe(0);
  });

  it("returns 0, clamped, when pairsCount exceeds REFERENCE_MAX_AVAILABILITY", () => {
    expect(computeGamesComponent(REFERENCE_MAX_AVAILABILITY * 2)).toBe(0);
  });

  it("returns a proportional value for a partial pairsCount", () => {
    // REFERENCE_MAX_AVAILABILITY (25) is odd, so use an exact count (10)
    // instead of "half" to keep the expected value unambiguous.
    const count = 10;
    expect(computeGamesComponent(count)).toBeCloseTo(
      100 - (count / REFERENCE_MAX_AVAILABILITY) * 100,
    );
  });

  it("returns a proportional value for pairsCount = 1", () => {
    expect(computeGamesComponent(1)).toBeCloseTo(
      100 - (1 / REFERENCE_MAX_AVAILABILITY) * 100,
    );
  });

  it("returns a proportional value for pairsCount = 5", () => {
    expect(computeGamesComponent(5)).toBeCloseTo(
      100 - (5 / REFERENCE_MAX_AVAILABILITY) * 100,
    );
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

// ---- applyOneTimeOnlyChainFloor -----------------------------------------------

describe("applyOneTimeOnlyChainFloor", () => {
  describe("rootOneTimeOnly = false", () => {
    it("leaves the tier untouched at depth 0", () => {
      expect(applyOneTimeOnlyChainFloor("common", false, 0)).toBe("common");
    });

    it("leaves the tier untouched at depth 1", () => {
      expect(applyOneTimeOnlyChainFloor("common", false, 1)).toBe("common");
    });

    it("leaves the tier untouched at depth 2", () => {
      expect(applyOneTimeOnlyChainFloor("common", false, 2)).toBe("common");
    });
  });

  describe("rootOneTimeOnly = true, depth 0 (epic floor)", () => {
    it("raises common up to epic", () => {
      expect(applyOneTimeOnlyChainFloor("common", true, 0)).toBe("epic");
    });

    it("raises rare up to epic", () => {
      expect(applyOneTimeOnlyChainFloor("rare", true, 0)).toBe("epic");
    });

    it("leaves epic untouched (already at the floor)", () => {
      expect(applyOneTimeOnlyChainFloor("epic", true, 0)).toBe("epic");
    });

    it("leaves ultra_rare untouched (already above the floor)", () => {
      expect(applyOneTimeOnlyChainFloor("ultra_rare", true, 0)).toBe(
        "ultra_rare",
      );
    });

    it("leaves mythic untouched (already above the floor)", () => {
      expect(applyOneTimeOnlyChainFloor("mythic", true, 0)).toBe("mythic");
    });

    it("leaves legendary untouched (already above the floor)", () => {
      expect(applyOneTimeOnlyChainFloor("legendary", true, 0)).toBe(
        "legendary",
      );
    });
  });

  describe("rootOneTimeOnly = true, depth 1 (ultra_rare floor)", () => {
    it("raises rare up to ultra_rare", () => {
      expect(applyOneTimeOnlyChainFloor("rare", true, 1)).toBe("ultra_rare");
    });

    it("raises epic up to ultra_rare", () => {
      expect(applyOneTimeOnlyChainFloor("epic", true, 1)).toBe("ultra_rare");
    });

    it("leaves ultra_rare untouched (already at the floor)", () => {
      expect(applyOneTimeOnlyChainFloor("ultra_rare", true, 1)).toBe(
        "ultra_rare",
      );
    });

    it("leaves legendary untouched (already above the floor)", () => {
      expect(applyOneTimeOnlyChainFloor("legendary", true, 1)).toBe(
        "legendary",
      );
    });
  });

  describe("rootOneTimeOnly = true, depth 2 (mythic floor)", () => {
    it("raises rare up to mythic", () => {
      expect(applyOneTimeOnlyChainFloor("rare", true, 2)).toBe("mythic");
    });

    it("raises ultra_rare up to mythic", () => {
      expect(applyOneTimeOnlyChainFloor("ultra_rare", true, 2)).toBe(
        "mythic",
      );
    });

    it("leaves legendary untouched (already above the floor)", () => {
      expect(applyOneTimeOnlyChainFloor("legendary", true, 2)).toBe(
        "legendary",
      );
    });
  });

  describe("rootOneTimeOnly = true, depth 3+ (still mythic floor, capped)", () => {
    it("raises rare up to mythic", () => {
      expect(applyOneTimeOnlyChainFloor("rare", true, 3)).toBe("mythic");
    });

    it("raises ultra_rare up to mythic", () => {
      expect(applyOneTimeOnlyChainFloor("ultra_rare", true, 3)).toBe(
        "mythic",
      );
    });

    it("leaves legendary untouched (already above the floor)", () => {
      expect(applyOneTimeOnlyChainFloor("legendary", true, 3)).toBe(
        "legendary",
      );
    });
  });
});

// ---- getMaxEncounterChance ---------------------------------------------------

describe("getMaxEncounterChance", () => {
  it("returns null for an empty/undefined encounters list", () => {
    expect(getMaxEncounterChance([])).toBeNull();
    expect(getMaxEncounterChance(undefined as any)).toBeNull();
  });

  it("returns null when no numeric chance is found anywhere (gift-only)", () => {
    const encounters = [encounterEntry("red", "gift")];
    expect(getMaxEncounterChance(encounters)).toBeNull();
  });

  it("returns the highest chance found across a typical multi-game wild Pokémon", () => {
    const encounters = [
      encounterEntry("red", "walk", 20),
      encounterEntry("blue", "walk", 60),
      encounterEntry("yellow", "grass", 45),
    ];
    expect(getMaxEncounterChance(encounters)).toBe(60);
  });

  it("returns the single recorded chance for a single-version-exclusive case", () => {
    const encounters = [encounterEntry("emerald", "walk", 15)];
    expect(getMaxEncounterChance(encounters)).toBe(15);
  });

  it("Route 103 Poochyena regression: sums chances sharing the same location+version+method group rather than taking the max individual slot", () => {
    const encounters = [
      {
        location_area: { name: "route-103-area" },
        version_details: [
          {
            version: { name: "emerald" },
            encounter_details: [
              { method: { name: "walk" }, chance: 20 },
              { method: { name: "walk" }, chance: 20 },
              { method: { name: "walk" }, chance: 10 },
              { method: { name: "walk" }, chance: 10 },
            ],
          },
        ],
      },
    ];
    expect(getMaxEncounterChance(encounters)).toBe(60);
  });

  it("caps a grouped sum at 100 when PokéAPI lists the same non-excluded encounter multiple times under one location+version+method", () => {
    // Regression fixture uses "walk" (a genuine wild method, NOT in
    // FIXED_ENCOUNTER_METHODS) so the cap logic stays covered independent
    // of the devon-scope/gift exclusion feature below.
    const encounters = [
      {
        location_area: { name: "route-120-area" },
        version_details: [
          {
            version: { name: "ruby" },
            encounter_details: [
              { method: { name: "walk" }, chance: 100 },
              { method: { name: "walk" }, chance: 100 },
              { method: { name: "walk" }, chance: 100 },
              { method: { name: "walk" }, chance: 100 },
              { method: { name: "walk" }, chance: 100 },
              { method: { name: "walk" }, chance: 100 },
            ],
          },
        ],
      },
    ];
    // Uncapped, the grouped sum would be 600 (6 x 100). A single group can
    // never legitimately exceed 100%, so the result must be capped there.
    expect(getMaxEncounterChance(encounters)).toBe(100);
  });

  it("devon-scope-only regression: uses fixed-encounter entries as-is (grouped and capped at 100) when no genuine wild entry exists anywhere", () => {
    // devon-scope is a scripted/guaranteed trigger, not a genuine wild spawn
    // roll, so it's normally excluded in favor of a genuine wild entry — but
    // here NO genuine wild entry exists anywhere in the data, so there's
    // nothing else to go on: the devon-scope entries are used as-is, grouped
    // by location+version+method (sum = 6 x 100 = 600) and capped at 100.
    const encounters = [
      {
        location_area: { name: "route-120-area" },
        version_details: [
          {
            version: { name: "ruby" },
            encounter_details: [
              { method: { name: "devon-scope" }, chance: 100 },
              { method: { name: "devon-scope" }, chance: 100 },
              { method: { name: "devon-scope" }, chance: 100 },
              { method: { name: "devon-scope" }, chance: 100 },
              { method: { name: "devon-scope" }, chance: 100 },
              { method: { name: "devon-scope" }, chance: 100 },
            ],
          },
        ],
      },
    ];
    expect(getMaxEncounterChance(encounters)).toBe(100);
  });

  it("starter-like gift-only case: returns the gift chance as-is (100), no exclusion, no fallback to null", () => {
    const encounters = [encounterEntry("red", "gift", 100)];
    expect(getMaxEncounterChance(encounters)).toBe(100);
  });

  it("Kecleon mixed case: ignores a devon-scope entry's 100% chance and returns only the genuine wild method's chance", () => {
    const encounters = [
      // Genuine wild grass encounter: 1% chance.
      locationEncounterEntry("route-119-area", "ruby", "walk", 1),
      // Guaranteed devon-scope trigger at a different spot: must be
      // ignored entirely, not treated as the "real" max chance.
      {
        location_area: { name: "route-120-area" },
        version_details: [
          {
            version: { name: "ruby" },
            encounter_details: [{ method: { name: "devon-scope" }, chance: 100 }],
          },
        ],
      },
    ];
    expect(getMaxEncounterChance(encounters)).toBe(1);
  });

  it("picks the MAX across distinct groups without summing entries that belong to different location/version/method groups", () => {
    const encounters = [
      {
        // Group A: route-103-area | emerald | walk -> sum 60
        location_area: { name: "route-103-area" },
        version_details: [
          {
            version: { name: "emerald" },
            encounter_details: [
              { method: { name: "walk" }, chance: 20 },
              { method: { name: "walk" }, chance: 20 },
              { method: { name: "walk" }, chance: 10 },
              { method: { name: "walk" }, chance: 10 },
            ],
          },
        ],
      },
      {
        // Group B: same location+version as A but a different method ->
        // must stay a separate group, not merged into A's sum.
        location_area: { name: "route-103-area" },
        version_details: [
          {
            version: { name: "emerald" },
            encounter_details: [{ method: { name: "surf" }, chance: 50 }],
          },
        ],
      },
      {
        // Group C: a different location entirely, same version+method as A,
        // with the single highest group sum (90).
        location_area: { name: "route-102-area" },
        version_details: [
          {
            version: { name: "emerald" },
            encounter_details: [{ method: { name: "walk" }, chance: 90 }],
          },
        ],
      },
    ];
    // Max across groups is 90 (group C). If groups were summed together
    // instead of compared, this would wrongly return 200 (60 + 50 + 90).
    expect(getMaxEncounterChance(encounters)).toBe(90);
  });

  it("does not crash and still forms a valid group when location_area or its name is missing", () => {
    const missingLocationArea = [
      {
        version_details: [
          {
            version: { name: "ruby" },
            encounter_details: [{ method: { name: "walk" }, chance: 25 }],
          },
        ],
      },
    ];
    expect(getMaxEncounterChance(missingLocationArea)).toBe(25);

    const locationAreaWithoutName = [
      {
        location_area: {},
        version_details: [
          {
            version: { name: "sapphire" },
            encounter_details: [{ method: { name: "walk" }, chance: 30 }],
          },
        ],
      },
    ];
    expect(getMaxEncounterChance(locationAreaWithoutName)).toBe(30);
  });
});

// ---- getDistinctVersionNames --------------------------------------------------

describe("getDistinctVersionNames", () => {
  it("returns an empty array for an empty/undefined encounters list", () => {
    expect(getDistinctVersionNames([])).toEqual([]);
    expect(getDistinctVersionNames(undefined as any)).toEqual([]);
  });

  it("returns a sorted array of distinct version names for a typical multi-game wild Pokémon", () => {
    const encounters = [
      encounterEntry("yellow", "walk", 20),
      encounterEntry("blue", "walk", 60),
      encounterEntry("red", "grass", 45),
    ];
    expect(getDistinctVersionNames(encounters)).toEqual(["blue", "red", "yellow"]);
  });

  it("returns a single-element array for a single-version-exclusive case", () => {
    const encounters = [encounterEntry("emerald", "walk", 15)];
    expect(getDistinctVersionNames(encounters)).toEqual(["emerald"]);
  });

  it("returns a single-element array for a gift-only case", () => {
    const encounters = [encounterEntry("red", "gift"), encounterEntry("blue", "gift")];
    expect(getDistinctVersionNames(encounters)).toEqual(["blue", "red"]);
  });
});

// ---- getDistinctLocationVersionPairs --------------------------------------------

describe("getDistinctLocationVersionPairs", () => {
  it("returns an empty array for an empty/undefined encounters list", () => {
    expect(getDistinctLocationVersionPairs([])).toEqual([]);
    expect(getDistinctLocationVersionPairs(undefined as any)).toEqual([]);
  });

  it("returns one pair-key per distinct location within a single version", () => {
    const encounters = [
      locationEncounterEntry("route-101", "emerald", "walk", 10),
      locationEncounterEntry("route-102", "emerald", "walk", 10),
      locationEncounterEntry("route-103", "emerald", "walk", 10),
    ];
    expect(getDistinctLocationVersionPairs(encounters)).toEqual([
      "route-101|emerald",
      "route-102|emerald",
      "route-103|emerald",
    ]);
  });

  it("treats the same location across different versions as separate pairs", () => {
    const encounters = [
      locationEncounterEntry("route-101", "ruby", "walk", 10),
      locationEncounterEntry("route-101", "sapphire", "walk", 10),
    ];
    expect(getDistinctLocationVersionPairs(encounters)).toEqual([
      "route-101|ruby",
      "route-101|sapphire",
    ]);
  });

  it("does not double-count duplicate entries at the exact same location+version", () => {
    const encounters = [
      locationEncounterEntry("route-101", "emerald", "walk", 10),
      locationEncounterEntry("route-101", "emerald", "surf", 5),
    ];
    const result = getDistinctLocationVersionPairs(encounters);
    expect(result).toHaveLength(1);
    expect(result).toEqual(["route-101|emerald"]);
  });
});

// ---- getDistinctMethods --------------------------------------------------------

describe("getDistinctMethods", () => {
  it("returns an empty array for an empty/undefined encounters list", () => {
    expect(getDistinctMethods([])).toEqual([]);
    expect(getDistinctMethods(undefined as any)).toEqual([]);
  });

  it("returns a sorted array of distinct methods for a typical multi-game wild Pokémon", () => {
    const encounters = [
      multiMethodEntry("red", [{ method: "walk" }, { method: "surf" }]),
      encounterEntry("blue", "grass"),
    ];
    expect(getDistinctMethods(encounters)).toEqual(["grass", "surf", "walk"]);
  });

  it("returns a single-element array for a single-version-exclusive case", () => {
    const encounters = [encounterEntry("emerald", "rock-smash", 15)];
    expect(getDistinctMethods(encounters)).toEqual(["rock-smash"]);
  });

  it("returns ['gift'] for a gift-only case", () => {
    const encounters = [encounterEntry("red", "gift"), encounterEntry("blue", "gift")];
    expect(getDistinctMethods(encounters)).toEqual(["gift"]);
  });
});

// ---- getEasiestMethod -----------------------------------------------------------

describe("getEasiestMethod", () => {
  it("returns null for an empty/undefined encounters list", () => {
    expect(getEasiestMethod([])).toBeNull();
    expect(getEasiestMethod(undefined as any)).toBeNull();
  });

  it("picks the easiest method for a typical multi-game wild Pokémon", () => {
    const encounters = [
      multiMethodEntry("red", [{ method: "surf" }, { method: "walk" }]),
      encounterEntry("blue", "gift"),
    ];
    expect(getEasiestMethod(encounters)).toBe("walk");
  });

  it("returns the single method for a single-version-exclusive case", () => {
    const encounters = [encounterEntry("emerald", "old-rod", 10)];
    expect(getEasiestMethod(encounters)).toBe("old-rod");
  });

  it("returns 'gift' for a gift-only case", () => {
    const encounters = [encounterEntry("red", "gift"), encounterEntry("blue", "gift")];
    expect(getEasiestMethod(encounters)).toBe("gift");
  });

  it("falls back to DEFAULT_METHOD_DIFFICULTY ranking for an unrecognized method", () => {
    const encounters = [
      multiMethodEntry("red", [{ method: "some-unknown-method" }, { method: "gift" }]),
    ];
    // unknown method uses DEFAULT_METHOD_DIFFICULTY (60), which is lower than gift (100)
    expect(getEasiestMethod(encounters)).toBe("some-unknown-method");
  });
});

// ---- getEvolutionInfo -----------------------------------------------------------

describe("getEvolutionInfo", () => {
  it("returns null when the evolutionChain argument is missing/null", () => {
    expect(getEvolutionInfo(undefined as any, "bulbasaur")).toBeNull();
    expect(getEvolutionInfo(null as any, "bulbasaur")).toBeNull();
    expect(getEvolutionInfo({ chain: undefined } as any, "bulbasaur")).toBeNull();
  });

  it("returns null when the species is not found in the chain", () => {
    const chain = {
      chain: {
        species: { name: "bulbasaur" },
        evolution_details: [],
        evolves_to: [],
      },
    };
    expect(getEvolutionInfo(chain as any, "charmander")).toBeNull();
  });

  it("returns depth 0 with a null trigger for the base form", () => {
    const chain = {
      chain: {
        species: { name: "bulbasaur" },
        evolution_details: [],
        evolves_to: [],
      },
    };
    expect(getEvolutionInfo(chain as any, "bulbasaur")).toEqual({ depth: 0, trigger: null });
  });

  it("returns depth 1 with the explicit trigger name for a depth-1 evolution", () => {
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
    expect(getEvolutionInfo(chain as any, "ivysaur")).toEqual({
      depth: 1,
      trigger: "level-up",
    });
  });

  it("returns null trigger at depth 1 when evolution_details/trigger is missing", () => {
    const chain = {
      chain: {
        species: { name: "eevee" },
        evolution_details: [],
        evolves_to: [
          {
            species: { name: "vaporeon" },
            evolution_details: [],
            evolves_to: [],
          },
        ],
      },
    };
    expect(getEvolutionInfo(chain as any, "vaporeon")).toEqual({ depth: 1, trigger: null });
  });
});

// ---- filterEncountersToVersions ---------------------------------------

describe("filterEncountersToVersions", () => {
  it("returns [] for non-array input", () => {
    expect(filterEncountersToVersions(null as any, new Set(["red"]))).toEqual([]);
    expect(filterEncountersToVersions(undefined as any, new Set(["red"]))).toEqual([]);
  });

  it("returns [] for an empty encounters array", () => {
    expect(filterEncountersToVersions([], new Set(["red"]))).toEqual([]);
  });

  it("drops a location entry whose version_details are all outside the allowed set", () => {
    const encounters = [
      {
        location_area: { name: "route-1" },
        version_details: [
          { version: { name: "red" }, encounter_details: [] },
          { version: { name: "blue" }, encounter_details: [] },
        ],
      },
    ];
    const result = filterEncountersToVersions(encounters, new Set(["emerald"]));
    expect(result).toEqual([]);
  });

  it("keeps a location entry with a mix of allowed/disallowed versions, trimmed to only the allowed ones", () => {
    const encounters = [
      {
        location_area: { name: "route-101" },
        version_details: [
          { version: { name: "emerald" }, encounter_details: [{ method: { name: "walk" } }] },
          { version: { name: "red" }, encounter_details: [{ method: { name: "walk" } }] },
        ],
      },
    ];
    const result = filterEncountersToVersions(encounters, new Set(["emerald"]));
    expect(result).toHaveLength(1);
    expect(result[0].version_details).toHaveLength(1);
    expect(result[0].version_details[0].version.name).toBe("emerald");
    expect(
      result[0].version_details.some((vd: any) => vd.version.name === "red"),
    ).toBe(false);
  });

  it("across multiple location entries, keeps only those with at least one allowed version, each correctly trimmed", () => {
    const allowedOnly = {
      location_area: { name: "route-102" },
      version_details: [
        { version: { name: "emerald" }, encounter_details: [] },
      ],
    };
    const disallowedOnly = {
      location_area: { name: "route-103" },
      version_details: [
        { version: { name: "red" }, encounter_details: [] },
      ],
    };
    const mixed = {
      location_area: { name: "route-104" },
      version_details: [
        { version: { name: "emerald" }, encounter_details: [] },
        { version: { name: "sapphire" }, encounter_details: [] },
        { version: { name: "red" }, encounter_details: [] },
      ],
    };
    const encounters = [allowedOnly, disallowedOnly, mixed];
    const result = filterEncountersToVersions(
      encounters,
      new Set(["emerald", "sapphire"]),
    );

    expect(result).toHaveLength(2);
    expect(result[0].location_area.name).toBe("route-102");
    expect(result[0].version_details).toHaveLength(1);
    expect(result[1].location_area.name).toBe("route-104");
    expect(result[1].version_details).toHaveLength(2);
    expect(
      result[1].version_details.map((vd: any) => vd.version.name).sort(),
    ).toEqual(["emerald", "sapphire"]);
  });

  it("does not mutate the input encounters array or its objects", () => {
    const original = [
      {
        location_area: { name: "route-1" },
        version_details: [
          { version: { name: "emerald" }, encounter_details: [{ method: { name: "walk" } }] },
          { version: { name: "red" }, encounter_details: [{ method: { name: "walk" } }] },
        ],
      },
    ];
    const snapshot = JSON.parse(JSON.stringify(original));

    filterEncountersToVersions(original, new Set(["emerald"]));

    expect(original).toEqual(snapshot);
    expect(original[0].version_details).toHaveLength(2);
  });

  it("sanity check with the real GEN3_VERSIONS constant: only the Gen 3 version survives", () => {
    const encounters = [
      {
        location_area: { name: "route-1" },
        version_details: [
          { version: { name: "emerald" }, encounter_details: [{ method: { name: "walk" } }] },
          { version: { name: "sword" }, encounter_details: [{ method: { name: "walk" } }] },
        ],
      },
    ];
    const result = filterEncountersToVersions(encounters, GEN3_VERSIONS);
    expect(result).toHaveLength(1);
    expect(result[0].version_details).toHaveLength(1);
    expect(result[0].version_details[0].version.name).toBe("emerald");
  });
});

// ---- getParentSpeciesId -------------------------------------------------

describe("getParentSpeciesId", () => {
  it("returns null for the root species (depth 0, no parent)", () => {
    const chain = {
      chain: {
        species: {
          name: "bulbasaur",
          url: "https://pokeapi.co/api/v2/pokemon-species/1/",
        },
        evolution_details: [],
        evolves_to: [],
      },
    };
    expect(getParentSpeciesId(chain as any, "bulbasaur")).toBeNull();
  });

  it("returns the root's numeric id for a depth-1 species", () => {
    const chain = {
      chain: {
        species: {
          name: "bulbasaur",
          url: "https://pokeapi.co/api/v2/pokemon-species/1/",
        },
        evolution_details: [],
        evolves_to: [
          {
            species: {
              name: "ivysaur",
              url: "https://pokeapi.co/api/v2/pokemon-species/2/",
            },
            evolution_details: [{ trigger: { name: "level-up" } }],
            evolves_to: [],
          },
        ],
      },
    };
    expect(getParentSpeciesId(chain as any, "ivysaur")).toBe(1);
  });

  it("returns the immediate parent's numeric id (not the root's) for a depth-2 species", () => {
    const chain = {
      chain: {
        species: {
          name: "caterpie",
          url: "https://pokeapi.co/api/v2/pokemon-species/1/",
        },
        evolution_details: [],
        evolves_to: [
          {
            species: {
              name: "metapod",
              url: "https://pokeapi.co/api/v2/pokemon-species/2/",
            },
            evolution_details: [{ trigger: { name: "level-up" } }],
            evolves_to: [
              {
                species: {
                  name: "butterfree",
                  url: "https://pokeapi.co/api/v2/pokemon-species/3/",
                },
                evolution_details: [{ trigger: { name: "level-up" } }],
                evolves_to: [],
              },
            ],
          },
        ],
      },
    };
    expect(getParentSpeciesId(chain as any, "butterfree")).toBe(2);
  });

  it("returns null when the species is not found anywhere in the chain", () => {
    const chain = {
      chain: {
        species: {
          name: "bulbasaur",
          url: "https://pokeapi.co/api/v2/pokemon-species/1/",
        },
        evolution_details: [],
        evolves_to: [],
      },
    };
    expect(getParentSpeciesId(chain as any, "charmander")).toBeNull();
  });

  it("returns null when evolutionChain is null or undefined", () => {
    expect(getParentSpeciesId(null, "bulbasaur")).toBeNull();
    expect(getParentSpeciesId(undefined, "bulbasaur")).toBeNull();
  });

  it("returns null when evolutionChain.chain is missing", () => {
    expect(getParentSpeciesId({ chain: undefined } as any, "bulbasaur")).toBeNull();
  });

  it("returns null when the parent node's species.url is an empty string", () => {
    const chain = {
      chain: {
        species: { name: "bulbasaur", url: "" },
        evolution_details: [],
        evolves_to: [
          {
            species: {
              name: "ivysaur",
              url: "https://pokeapi.co/api/v2/pokemon-species/2/",
            },
            evolution_details: [{ trigger: { name: "level-up" } }],
            evolves_to: [],
          },
        ],
      },
    };
    expect(getParentSpeciesId(chain as any, "ivysaur")).toBeNull();
  });

  it("returns null when the parent node's species.url has no trailing numeric id", () => {
    const chain = {
      chain: {
        species: { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon-species/" },
        evolution_details: [],
        evolves_to: [
          {
            species: {
              name: "ivysaur",
              url: "https://pokeapi.co/api/v2/pokemon-species/2/",
            },
            evolution_details: [{ trigger: { name: "level-up" } }],
            evolves_to: [],
          },
        ],
      },
    };
    expect(getParentSpeciesId(chain as any, "ivysaur")).toBeNull();
  });
});
