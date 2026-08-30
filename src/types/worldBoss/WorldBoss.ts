import { WorldBossStats } from "./WorldBossStats";

/**
 * World boss instancié pour l'événement de la semaine : l'entrée de la liste
 * figée dans l'état, augmentée de la difficulté et des statistiques finales.
 */
export type WorldBoss = {
  id: string;
  name: string;
  portal: string;
  sprite: string;
  types: string[];
  attackType: string;
  difficulty: number;
  baseStats: WorldBossStats;
  finalStats: WorldBossStats;
  defenseEffectiveness: Record<string, number>;
  lore: string;
};
