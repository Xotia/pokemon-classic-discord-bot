import { RaidStats } from "./RaidStats";

export type RaidBoss = {
    id: number;
    name: string;
    difficulty: number;
    types: string[];
    attackType: string;
    baseStats: RaidStats;
    finalStats: RaidStats;
    defenseEffectiveness: Record<string, number>;
    zone : string;
}