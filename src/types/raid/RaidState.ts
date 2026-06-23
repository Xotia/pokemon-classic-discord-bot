import { RaidBoss } from "./RaidBoss";
import { RaidDefender } from "./RaidDefender";
import { RaidResult } from "./RaidResult";
import { RaidReward } from "./RaidReward";
import { RaidStatus } from "./RaidStatus";

export interface RaidState {
  raidId: string;
  status: RaidStatus;
  createdAt: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  resolvedAt: string | null;
  generation: number | null;
  zone: string | null;
  raidPokemon: RaidBoss | null;
  defenders: RaidDefender[];
  result: RaidResult | null;
  reward: RaidReward | null;
}