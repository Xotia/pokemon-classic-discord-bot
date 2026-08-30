import { WorldBossStats } from "./WorldBossStats";

/**
 * Issue du combat. Superset du RaidResult : le world boss compte en plus le
 * nombre de serveurs représentés dans l'équipe.
 */
export interface WorldBossResult {
  success: boolean;
  missingStats: string[];
  participantsCount: number;
  guildsCount: number;
  teamStats: WorldBossStats;
  statDiffs: WorldBossStats;
}
