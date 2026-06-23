import { Zone } from "../../types/zones";
import { loadUnlockedZones } from "../../utils/loadUnlockedZones";

export function getZonesByGeneration(generation: string): Zone[] {
  const unlockedZones = loadUnlockedZones();
  return unlockedZones[generation] ?? [];
}
