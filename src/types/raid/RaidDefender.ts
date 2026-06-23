import { RaidStats } from "./RaidStats";

export interface RaidDefender {
  userId: string;
  pokemonId: number;
  pokemonName: string;
  attackType: string;
  registeredAt: string;
  snapshot: {
    types: string[];
    defenseEffectiveness: Record<string, number>;
    stats: RaidStats;
  };
}