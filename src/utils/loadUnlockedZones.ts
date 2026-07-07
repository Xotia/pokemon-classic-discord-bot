import fs from "fs";
import { zonesUnlockedDb } from "../config/paths";
import { Zone } from "../types/zones";

export function loadUnlockedZones(guildId: string): Record<string, Zone[]> {
  const raw = fs.readFileSync(zonesUnlockedDb(guildId), "utf-8");
  return JSON.parse(raw) as Record<string, Zone[]>;
}
