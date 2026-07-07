import { Zone } from "../../types/zones";
import { loadUnlockedZones } from "../../utils/loadUnlockedZones";

export function getZonesByGeneration(guildId: string, generation: string): Zone[] {
  const unlockedZones = loadUnlockedZones(guildId);
  return unlockedZones[generation] ?? [];
}
