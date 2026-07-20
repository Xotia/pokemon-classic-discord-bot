import { getZonesByGeneration } from "./getZonesByGeneration";

export function isZoneInGeneration(guildId: string, zoneId: string, generation: string): boolean {
  return getZonesByGeneration(guildId, generation).some((zone) => zone.id === zoneId);
}
