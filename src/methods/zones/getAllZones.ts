import zones from "../../../data/zones_all.json";
import { ZoneEntry, Zone } from "../../types/zones";

const typedZones: Record<string, Zone[]> = zones;

export function getAllZones(): ZoneEntry[] {
  return Object.values(typedZones).flat();
}