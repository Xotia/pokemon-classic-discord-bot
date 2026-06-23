import { getZonesByGeneration } from "./getZonesByGeneration";

export function isZoneInGeneration(zoneId: string, generation: string): boolean {
  return getZonesByGeneration(generation).some((zone) => zone.id === zoneId);
}
