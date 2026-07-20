import { Rarity } from "../config/rarity";

export interface RarityComponents {
  c1_encounterRate: number;
  c3_games: number;
  c4_method: number;
  c5_exclusivity: number;
  c6_evolution: number;
  c7_oneTimeOnly: number;
}

export interface RarityResult {
  id: number;
  rarity: Rarity;
  appliedRule:
    | "priority:species_fetch_failed"
    | "priority:is_mythical"
    | "priority:is_legendary"
    | "priority:no_encounters_absent"
    | "composite";
  finalScore: number | null;
  components: RarityComponents | null;
  oneTimeOnly: boolean;
  flooredToEpic: boolean;
}
