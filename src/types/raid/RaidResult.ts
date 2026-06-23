import { RaidStats } from "./RaidStats";

  export interface RaidResult {
  success: boolean;
  missingStats: string[];
  participantsCount: number;
  teamStats: RaidStats;
  statDiffs: RaidStats;
}