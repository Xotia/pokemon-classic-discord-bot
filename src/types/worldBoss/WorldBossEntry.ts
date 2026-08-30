import { WorldBossStats } from "./WorldBossStats";

/**
 * Entrée de `data/world-boss-list.json` : la définition brute d'un world boss,
 * autonome (ses stats et ses efficacités ne dépendent pas du catalogue Pokémon).
 */
export interface WorldBossEntry {
  id: string;
  name: string;
  portal: string;
  sprite: string;
  types: string[];
  attackType: string;
  stats: WorldBossStats;
  defenseEffectiveness: Record<string, number>;
  lore: string;
}
