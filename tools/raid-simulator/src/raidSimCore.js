/**
 * Moteur de simulation du raid, miroir de `computeBruteBattleResult`
 * (src/features/raid/computeBruteRaidResult.ts).
 *
 * Ce fichier est chargé tel quel par le navigateur (via <script>) ET par
 * Node (via require) dans le test de parité
 * `tests/raid/raidSimulatorParity.test.ts`. Ce test compare, sur une matrice
 * de cas, la sortie de ce moteur à celle du moteur réel du bot : toute
 * divergence introduite ici ou là-bas fait échouer la suite.
 *
 * Règle : ne JAMAIS "améliorer" un calcul de ce fichier isolément. Le
 * simulateur n'a de valeur pour le joueur que s'il donne exactement le
 * verdict que le bot donnera.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.RaidSimCore = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Les 5 axes qui décident de la victoire. Les PV n'en font pas partie. */
  const COMBAT_STAT_KEYS = ["attack", "specialAttack", "defense", "specialDefense", "speed"];
  const ALL_STAT_KEYS = ["hp"].concat(COMBAT_STAT_KEYS);

  /**
   * Chaque stat de l'équipe affronte la stat OPPOSÉE du boss. Copie de
   * RAID_STAT_MATCHUPS, verrouillée par le test de parité.
   */
  const STAT_MATCHUPS = {
    hp: "hp",
    attack: "defense",
    specialAttack: "specialDefense",
    defense: "attack",
    specialDefense: "specialAttack",
    speed: "speed",
  };

  function createEmptyStats() {
    return { hp: 0, attack: 0, specialAttack: 0, defense: 0, specialDefense: 0, speed: 0 };
  }

  function getEffectivenessMultiplier(defenseEffectiveness, attackType) {
    if (!attackType) {
      return 1;
    }
    const value = defenseEffectiveness ? defenseEffectiveness[attackType] : undefined;
    return value === undefined || value === null ? 1 : value;
  }

  function multiplyStats(stats, multiplier) {
    return {
      hp: stats.hp * multiplier,
      attack: stats.attack * multiplier,
      specialAttack: stats.specialAttack * multiplier,
      defense: stats.defense * multiplier,
      specialDefense: stats.specialDefense * multiplier,
      speed: stats.speed * multiplier,
    };
  }

  /**
   * @param boss {{ finalStats, attackType, defenseEffectiveness }}
   * @param defenders [{ attackType, stats, defenseEffectiveness }]
   *
   * L'ordre d'accumulation reproduit celui du bot (par défenseur, puis
   * hp → attack → specialAttack → defense → specialDefense → speed) :
   * en flottants, changer l'ordre change le dernier chiffre.
   */
  function computeBattle(boss, defenders) {
    const bossStats = boss.finalStats;
    const teamStats = createEmptyStats();
    const contributions = [];

    for (const defender of defenders) {
      const defenderStats = defender.stats;

      const attackEffectivenessAgainstBoss = getEffectivenessMultiplier(
        boss.defenseEffectiveness,
        defender.attackType,
      );
      const bossAttackEffectivenessAgainstDefender = getEffectivenessMultiplier(
        defender.defenseEffectiveness,
        boss.attackType,
      );

      teamStats.hp += defenderStats.hp;
      teamStats.attack += defenderStats.attack * attackEffectivenessAgainstBoss;
      teamStats.specialAttack += defenderStats.specialAttack * attackEffectivenessAgainstBoss;
      teamStats.defense += defenderStats.defense / bossAttackEffectivenessAgainstDefender;
      teamStats.specialDefense +=
        defenderStats.specialDefense / bossAttackEffectivenessAgainstDefender;
      teamStats.speed += defenderStats.speed;

      contributions.push({
        defender,
        attackEffectivenessAgainstBoss,
        bossAttackEffectivenessAgainstDefender,
        lines: {
          hp: { base: defenderStats.hp, op: null, result: defenderStats.hp },
          attack: {
            base: defenderStats.attack,
            op: "×",
            multiplier: attackEffectivenessAgainstBoss,
            result: defenderStats.attack * attackEffectivenessAgainstBoss,
          },
          specialAttack: {
            base: defenderStats.specialAttack,
            op: "×",
            multiplier: attackEffectivenessAgainstBoss,
            result: defenderStats.specialAttack * attackEffectivenessAgainstBoss,
          },
          defense: {
            base: defenderStats.defense,
            op: "÷",
            multiplier: bossAttackEffectivenessAgainstDefender,
            result: defenderStats.defense / bossAttackEffectivenessAgainstDefender,
          },
          specialDefense: {
            base: defenderStats.specialDefense,
            op: "÷",
            multiplier: bossAttackEffectivenessAgainstDefender,
            result: defenderStats.specialDefense / bossAttackEffectivenessAgainstDefender,
          },
          speed: { base: defenderStats.speed, op: null, result: defenderStats.speed },
        },
      });
    }

    // Comme dans le bot : seuls les 5 axes de combat portent un écart.
    // Les PV restent à 0 ici, l'écart affiché côté page est calculé à part
    // et signalé comme informatif.
    const statDiffs = createEmptyStats();
    for (const key of COMBAT_STAT_KEYS) {
      statDiffs[key] = teamStats[key] - bossStats[STAT_MATCHUPS[key]];
    }

    const missingStats = COMBAT_STAT_KEYS.filter(
      (key) => teamStats[key] <= bossStats[STAT_MATCHUPS[key]],
    );

    return {
      success: missingStats.length === 0,
      missingStats,
      participantsCount: defenders.length,
      teamStats,
      statDiffs,
      contributions,
    };
  }

  return {
    COMBAT_STAT_KEYS,
    ALL_STAT_KEYS,
    STAT_MATCHUPS,
    createEmptyStats,
    getEffectivenessMultiplier,
    multiplyStats,
    computeBattle,
  };
});
