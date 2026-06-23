import { Zone } from "../../types/zones";
import { loadUnlockedZones } from "../../utils/loadUnlockedZones";

export function getGenerationByZone(zoneId: string): string | undefined {
  const typedZones = loadUnlockedZones();

  for (const [generation, zones] of Object.entries(typedZones)) {
    if (zones.some((zone) => zone.id === zoneId)) {
      return generation;
    }
  }

  return undefined;
}
