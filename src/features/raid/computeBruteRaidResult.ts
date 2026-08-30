import { RaidResult } from "../../types/raid/RaidResult";
import { RaidState } from "../../types/raid/RaidState";
import { RaidStats } from "../../types/raid/RaidStats";

const RAID_STAT_KEYS: Array<keyof RaidStats> = [
  "attack",
  "specialAttack",
  "defense",
  "specialDefense",
  "speed",
];

/**
 * Chaque stat de l'équipe affronte la stat OPPOSÉE du boss : on encaisse ses
 * attaques avec nos défenses et on perce ses défenses avec nos attaques.
 * La vitesse reste face à la vitesse, seul axe symétrique.
 *
 * Exporté pour que resolveRaid construise le même appariement sur le chemin
 * "aucun défenseur".
 */
export const RAID_STAT_MATCHUPS: Record<keyof RaidStats, keyof RaidStats> = {
  hp: "hp",
  attack: "defense",
  specialAttack: "specialDefense",
  defense: "attack",
  specialDefense: "specialAttack",
  speed: "speed",
};

function createEmptyRaidStats(): RaidStats {
  return {
    hp: 0,
    attack: 0,
    specialAttack: 0,
    defense: 0,
    specialDefense: 0,
    speed: 0,
  };
}

function getEffectivenessMultiplier(
  defenseEffectiveness: Record<string, number> | undefined,
  attackType: string | undefined,
): number {
  if (!attackType) {
    return 1;
  }

  return defenseEffectiveness?.[attackType] ?? 1;
}

/**
 * Boss pur pour le calcul de combat : uniquement ce dont l'algorithme a
 * besoin, sans notion de RaidState. Réutilisable par la feature world boss.
 */
export type BruteBattleBoss = {
  finalStats: RaidStats;
  attackType: string | undefined;
  defenseEffectiveness: Record<string, number> | undefined;
};

/**
 * Défenseur pur pour le calcul de combat : idem, sans notion de RaidState.
 */
export type BruteBattleDefender = {
  attackType: string | undefined;
  snapshot: {
    defenseEffectiveness: Record<string, number> | undefined;
    stats: RaidStats;
  };
};

/**
 * Calcul de combat "à la brute" partagé entre le raid et le world boss :
 * additionne les stats des défenseurs (pondérées par les efficacités de
 * type) et les compare aux stats du boss, appariées via RAID_STAT_MATCHUPS.
 *
 * Fonction pure, aucune dépendance à RaidState.
 */
export function computeBruteBattleResult(
  boss: BruteBattleBoss,
  defenders: BruteBattleDefender[],
): RaidResult {
  const bossStats = boss.finalStats;
  const raidAttackType = boss.attackType;
  const raidDefenseEffectiveness = boss.defenseEffectiveness;

  const teamStats = defenders.reduce<RaidStats>((total, defender) => {
    const defenderStats = defender.snapshot.stats;

    const attackEffectivenessAgainstBoss = getEffectivenessMultiplier(
      raidDefenseEffectiveness,
      defender.attackType,
    );

    const bossAttackEffectivenessAgainstDefender = getEffectivenessMultiplier(
      defender.snapshot.defenseEffectiveness,
      raidAttackType,
    );

    total.hp += defenderStats.hp;
    total.attack += defenderStats.attack * attackEffectivenessAgainstBoss;
    total.specialAttack +=
      defenderStats.specialAttack * attackEffectivenessAgainstBoss;
    total.defense +=
      defenderStats.defense / bossAttackEffectivenessAgainstDefender;
    total.specialDefense +=
      defenderStats.specialDefense / bossAttackEffectivenessAgainstDefender;
    total.speed += defenderStats.speed;

    return total;
  }, createEmptyRaidStats());

  const statDiffs = RAID_STAT_KEYS.reduce<RaidStats>((diffs, stat) => {
    diffs[stat] = teamStats[stat] - bossStats[RAID_STAT_MATCHUPS[stat]];
    return diffs;
  }, createEmptyRaidStats());

  const missingStats = RAID_STAT_KEYS.filter(
    (stat) => teamStats[stat] <= bossStats[RAID_STAT_MATCHUPS[stat]],
  );

  return {
    success: missingStats.length === 0,
    missingStats,
    participantsCount: defenders.length,
    teamStats,
    statDiffs,
  };
}

export function computeBruteRaidResult(state: RaidState): RaidResult {
  if (!state.raidPokemon) {
    throw new Error("Cannot resolve raid without raidPokemon.");
  }

  return computeBruteBattleResult(state.raidPokemon, state.defenders);
}
