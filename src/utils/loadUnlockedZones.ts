import fs from "fs";
import path from "path";
import { Zone } from "../types/zones";

const ZONES_UNLOCKED_PATH = path.resolve("data/zones_unlocked.json");

export function loadUnlockedZones(): Record<string, Zone[]> {
  const raw = fs.readFileSync(ZONES_UNLOCKED_PATH, "utf-8");
  return JSON.parse(raw) as Record<string, Zone[]>;
}
