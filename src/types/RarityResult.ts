import { Rarity } from "../config/rarity";

export interface RarityComponents {
  c1_encounterRate: number;
  c3_games: number;
  c4_method: number;
  c5_exclusivity: number;
  c6_evolution: number;
  c7_oneTimeOnly: number;
}

export interface RawRarityData {
  isLegendary: boolean;
  isMythical: boolean;
  maxEncounterChance: number | null;
  gamesCount: number;
  locationsCount: number;
  versions: string[];
  methods: string[];
  easiestMethod: string | null;
  isVersionExclusive: boolean;
  evolutionDepth: number | null;
  evolutionTrigger: string | null;
}

export interface RarityResult {
  id: number;
  name: string | null;
  rarity: Rarity;
  appliedRule:
    | "priority:species_fetch_failed"
    | "priority:is_mythical"
    | "priority:is_legendary"
    | "priority:no_encounters_absent"
    | "priority:no_encounters_inherits_parent"
    | "composite";
  finalScore: number | null;
  components: RarityComponents | null;
  rawData: RawRarityData | null;
  oneTimeOnly: boolean;
  flooredByChain: boolean;
}
