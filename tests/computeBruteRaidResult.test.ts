import { describe, it, expect } from "vitest";
import { computeBruteRaidResult } from "../src/features/raid/computeBruteRaidResult";
import { RaidState } from "../src/types/raid/RaidState";
import { RaidStats } from "../src/types/raid/RaidStats";

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

/** Boss aux stats asymétriques : indispensable pour distinguer miroir et croisé. */
function makeBossState(finalStats: RaidStats, defenseEffectiveness: Record<string, number> = {}): RaidState {
  const base = makeState();
  return {
    ...base,
    raidPokemon: {
      ...base.raidPokemon!,
      finalStats,
      defenseEffectiveness,
    },
  };
}

function makeDefender(stats: RaidStats, attackType = "normal", defenseEffectiveness: Record<string, number> = {}) {
  return {
    userId: "u1",
    pokemonId: 1,
    pokemonName: "Defender",
    attackType,
    registeredAt: "2026-08-11T12:00:00.000Z",
    snapshot: {
      types: [attackType],
      defenseEffectiveness,
      stats,
    },
  };
}

describe("computeBruteRaidResult — appariement croisé des stats", () => {
  it("oppose la défense de l'équipe à l'attaque du boss, et son attaque à la défense du boss", () => {
    // Boss frappeur en carton : grosses attaques, défenses faibles.
    const state = makeBossState({
      hp: 100,
      attack: 200,
      specialAttack: 200,
      defense: 50,
      specialDefense: 50,
      speed: 50,
    });
    state.defenders = [
      makeDefender({
        hp: 100,
        attack: 60,
        specialAttack: 60,
        defense: 210,
        specialDefense: 210,
        speed: 60,
      }),
    ];

    const result = computeBruteRaidResult(state);

    // Croisé : 60 > 50 (défense du boss) et 210 > 200 (attaque du boss) sur les 4 axes.
    // En miroir, l'attaque de 60 aurait affronté les 200 du boss et l'équipe aurait perdu.
    expect(result.success).toBe(true);
    expect(result.missingStats).toEqual([]);
  });

  it("fait échouer une équipe trop faible en attaque face à un boss défensif", () => {
    // Boss mur : petites attaques, grosses défenses. Exactement l'inverse du cas précédent.
    const state = makeBossState({
      hp: 100,
      attack: 50,
      specialAttack: 50,
      defense: 200,
      specialDefense: 200,
      speed: 50,
    });
    state.defenders = [
      makeDefender({
        hp: 100,
        attack: 60,
        specialAttack: 60,
        defense: 210,
        specialDefense: 210,
        speed: 60,
      }),
    ];

    const result = computeBruteRaidResult(state);

    // En miroir cette équipe gagnait sur les 5 axes ; en croisé elle ne perce pas les défenses.
    expect(result.success).toBe(false);
    expect(result.missingStats).toEqual(["attack", "specialAttack"]);
  });

  it("calcule les écarts contre la stat affrontée, pas la stat homonyme", () => {
    const state = makeBossState({
      hp: 100,
      attack: 50,
      specialAttack: 70,
      defense: 200,
      specialDefense: 180,
      speed: 40,
    });
    state.defenders = [
      makeDefender({
        hp: 100,
        attack: 60,
        specialAttack: 60,
        defense: 210,
        specialDefense: 210,
        speed: 60,
      }),
    ];

    const result = computeBruteRaidResult(state);

    expect(result.statDiffs.attack).toBe(60 - 200); // notre attaque vs sa défense
    expect(result.statDiffs.specialAttack).toBe(60 - 180); // notre atq. spé vs sa déf. spé
    expect(result.statDiffs.defense).toBe(210 - 50); // notre défense vs son attaque
    expect(result.statDiffs.specialDefense).toBe(210 - 70); // notre déf. spé vs son atq. spé
    expect(result.statDiffs.speed).toBe(60 - 40); // seul axe resté symétrique
  });

  it("garde la vitesse face à la vitesse", () => {
    const state = makeBossState({
      hp: 100,
      attack: 10,
      specialAttack: 10,
      defense: 10,
      specialDefense: 10,
      speed: 300,
    });
    state.defenders = [
      makeDefender({
        hp: 100,
        attack: 60,
        specialAttack: 60,
        defense: 60,
        specialDefense: 60,
        speed: 60,
      }),
    ];

    const result = computeBruteRaidResult(state);

    expect(result.missingStats).toEqual(["speed"]);
  });

  it("laisse le bonus de type agir sur l'axe qu'il concerne : percer la défense du boss", () => {
    const bossStats = {
      hp: 100,
      attack: 10,
      specialAttack: 10,
      defense: 100,
      specialDefense: 100,
      speed: 10,
    };
    const defenderStats = {
      hp: 100,
      attack: 60,
      specialAttack: 60,
      defense: 60,
      specialDefense: 60,
      speed: 60,
    };

    const neutral = makeBossState(bossStats);
    neutral.defenders = [makeDefender(defenderStats, "grass")];
    // 60 <= 100 : sans bonus de type, la défense du boss tient.
    expect(computeBruteRaidResult(neutral).missingStats).toEqual([
      "attack",
      "specialAttack",
    ]);

    const weakToGrass = makeBossState(bossStats, { grass: 2 });
    weakToGrass.defenders = [makeDefender(defenderStats, "grass")];
    // 60*2=120 > 100 : le boss est faible au type, l'équipe passe.
    const result = computeBruteRaidResult(weakToGrass);
    expect(result.teamStats.attack).toBe(120);
    expect(result.success).toBe(true);
  });
});

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
