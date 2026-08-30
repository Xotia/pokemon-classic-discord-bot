import { describe, expect, it } from "vitest";
import {
  computeBruteBattleResult,
  RAID_STAT_MATCHUPS,
  BruteBattleBoss,
  BruteBattleDefender,
} from "../../src/features/raid/computeBruteRaidResult";
import { RaidStats } from "../../src/types/raid/RaidStats";

/**
 * Le simulateur web rejoue le combat dans le navigateur, sans TypeScript et
 * sans accès au bot. Ce test est le seul garde-fou contre la dérive entre les
 * deux implémentations : le jour où le moteur du bot change sans que
 * `raidSimCore.js` suive, un simulateur mis à disposition des joueurs se met
 * à annoncer des victoires qui n'auront pas lieu.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const core = require("../../tools/raid-simulator/src/raidSimCore.js") as {
  STAT_MATCHUPS: Record<string, string>;
  COMBAT_STAT_KEYS: string[];
  multiplyStats: (stats: RaidStats, multiplier: number) => RaidStats;
  computeBattle: (
    boss: { finalStats: RaidStats; attackType?: string; defenseEffectiveness?: Record<string, number> },
    defenders: Array<{
      attackType?: string;
      stats: RaidStats;
      defenseEffectiveness?: Record<string, number>;
    }>,
  ) => {
    success: boolean;
    missingStats: string[];
    participantsCount: number;
    teamStats: RaidStats;
    statDiffs: RaidStats;
  };
};

type SimDefender = {
  attackType?: string;
  stats: RaidStats;
  defenseEffectiveness?: Record<string, number>;
};

function stats(
  hp: number,
  attack: number,
  defense: number,
  specialAttack: number,
  specialDefense: number,
  speed: number,
): RaidStats {
  return { hp, attack, defense, specialAttack, specialDefense, speed };
}

const NEUTRAL: Record<string, number> = { fire: 1, water: 1, grass: 1, dragon: 1 };
const RESISTANT: Record<string, number> = { fire: 0.5, water: 2, grass: 0.25, dragon: 1 };
const IMMUNE: Record<string, number> = { fire: 0, water: 2, grass: 1, dragon: 0.5 };

/** Chaque cas est joué dans les deux moteurs et les sorties doivent coïncider. */
const CASES: Array<{
  name: string;
  boss: { baseStats: RaidStats; difficulty: number; attackType?: string; defenseEffectiveness?: Record<string, number> };
  defenders: SimDefender[];
}> = [
  {
    name: "équipe vide",
    boss: { baseStats: stats(78, 84, 78, 109, 85, 100), difficulty: 4, attackType: "fire", defenseEffectiveness: RESISTANT },
    defenders: [],
  },
  {
    name: "un défenseur neutre",
    boss: { baseStats: stats(78, 84, 78, 109, 85, 100), difficulty: 3, attackType: "fire", defenseEffectiveness: NEUTRAL },
    defenders: [{ attackType: "water", stats: stats(100, 120, 90, 80, 95, 110), defenseEffectiveness: NEUTRAL }],
  },
  {
    name: "équipe large qui l'emporte",
    boss: { baseStats: stats(50, 40, 40, 40, 40, 40), difficulty: 1, attackType: "grass", defenseEffectiveness: RESISTANT },
    defenders: Array.from({ length: 8 }, () => ({
      attackType: "water",
      stats: stats(90, 110, 85, 95, 88, 102),
      defenseEffectiveness: NEUTRAL,
    })),
  },
  {
    name: "défenseur immunisé au type du boss (division par 0 → défenses infinies)",
    boss: { baseStats: stats(78, 84, 78, 109, 85, 100), difficulty: 5, attackType: "fire", defenseEffectiveness: NEUTRAL },
    defenders: [{ attackType: "water", stats: stats(100, 120, 90, 80, 95, 110), defenseEffectiveness: IMMUNE }],
  },
  {
    name: "attaque du défenseur sans effet sur le boss (×0)",
    boss: { baseStats: stats(78, 84, 78, 109, 85, 100), difficulty: 2, attackType: "water", defenseEffectiveness: IMMUNE },
    defenders: [{ attackType: "fire", stats: stats(100, 120, 90, 80, 95, 110), defenseEffectiveness: RESISTANT }],
  },
  {
    name: "types absents des tables d'efficacité (repli à 1)",
    boss: { baseStats: stats(78, 84, 78, 109, 85, 100), difficulty: 3, attackType: "steel", defenseEffectiveness: NEUTRAL },
    defenders: [{ attackType: "ghost", stats: stats(100, 120, 90, 80, 95, 110), defenseEffectiveness: RESISTANT }],
  },
  {
    name: "type d'attaque non renseigné des deux côtés",
    boss: { baseStats: stats(78, 84, 78, 109, 85, 100), difficulty: 3, attackType: undefined, defenseEffectiveness: NEUTRAL },
    defenders: [{ attackType: undefined, stats: stats(100, 120, 90, 80, 95, 110), defenseEffectiveness: RESISTANT }],
  },
  {
    name: "équipe hétérogène, victoire à l'arraché",
    boss: { baseStats: stats(78, 84, 78, 109, 85, 100), difficulty: 3, attackType: "fire", defenseEffectiveness: RESISTANT },
    defenders: [
      { attackType: "water", stats: stats(95, 130, 80, 60, 75, 95), defenseEffectiveness: RESISTANT },
      { attackType: "grass", stats: stats(70, 65, 120, 110, 130, 60), defenseEffectiveness: IMMUNE },
      { attackType: "dragon", stats: stats(80, 100, 100, 100, 100, 100), defenseEffectiveness: NEUTRAL },
    ],
  },
];

describe("parité simulateur web / moteur de raid du bot", () => {
  it("expose exactement les mêmes appariements de stats", () => {
    expect(core.STAT_MATCHUPS).toEqual(RAID_STAT_MATCHUPS);
  });

  for (const testCase of CASES) {
    it(`donne le même résultat que le bot : ${testCase.name}`, () => {
      const finalStats = core.multiplyStats(testCase.boss.baseStats, testCase.boss.difficulty);

      const botBoss: BruteBattleBoss = {
        finalStats,
        attackType: testCase.boss.attackType,
        defenseEffectiveness: testCase.boss.defenseEffectiveness,
      };
      const botDefenders: BruteBattleDefender[] = testCase.defenders.map((defender) => ({
        attackType: defender.attackType,
        snapshot: {
          defenseEffectiveness: defender.defenseEffectiveness,
          stats: defender.stats,
        },
      }));

      const expected = computeBruteBattleResult(botBoss, botDefenders);
      const actual = core.computeBattle(
        {
          finalStats,
          attackType: testCase.boss.attackType,
          defenseEffectiveness: testCase.boss.defenseEffectiveness,
        },
        testCase.defenders,
      );

      expect(actual.success).toBe(expected.success);
      expect(actual.missingStats).toEqual(expected.missingStats);
      expect(actual.participantsCount).toBe(expected.participantsCount);
      expect(actual.teamStats).toEqual(expected.teamStats);
      expect(actual.statDiffs).toEqual(expected.statDiffs);
    });
  }
});
