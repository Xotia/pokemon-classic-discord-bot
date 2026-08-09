import { loadUnlockedZones } from "../../utils/loadUnlockedZones";
import { getMaxGeneration } from "./getMaxGeneration";

/**
 * Générations jouables : celles sous le plafond configuré ET qui ont au moins
 * une zone débloquée. Une génération ouverte côté config mais sans zone
 * débloquée n'est pas tirable.
 */
export function getAvailableGenerations(guildId: string): string[] {
  const unlockedZones = loadUnlockedZones(guildId);
  const maxGeneration = getMaxGeneration(guildId);
  const generations: string[] = [];

  for (let gen = 1; gen <= maxGeneration; gen++) {
    const key = `gen${gen}`;
    if ((unlockedZones[key] ?? []).length > 0) {
      generations.push(key);
    }
  }

  return generations;
}
