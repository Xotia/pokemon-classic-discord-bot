import zones from "../../../data/zones_all.json";
import { ZoneEntry, Zone } from "../../types/zones";
import { getAllZones } from "./getAllZones";

const typedZones: Record<string, Zone[]> = zones;

export function findZoneById(zoneId: string): ZoneEntry | undefined {
  return getAllZones().find((zone) => zone.id === zoneId);
}