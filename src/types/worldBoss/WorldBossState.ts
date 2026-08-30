import { WorldBoss } from "./WorldBoss";
import { WorldBossDefender } from "./WorldBossDefender";
import { WorldBossResult } from "./WorldBossResult";
import { WorldBossReward } from "./WorldBossReward";
import { WorldBossStatus } from "./WorldBossStatus";

/**
 * État global de l'événement, unique pour tout le parc de serveurs :
 * `data/world-boss.json`. Aucun `guildId` ici, c'est volontaire.
 */
export interface WorldBossState {
  worldBossId: string;
  status: WorldBossStatus;
  createdAt: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  resolvedAt: string | null;
  boss: WorldBoss | null;
  defenders: WorldBossDefender[];
  result: WorldBossResult | null;
  reward: WorldBossReward | null;
}
