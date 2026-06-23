import { promises as fs } from "node:fs";
import path from "node:path";
import logger from "../../utils/logger";

type ZoneEntry = { id: string; label: string };
type ZonesDb = Record<string, ZoneEntry[]>;

const ZONES_UNLOCKED_PATH = path.resolve("data/zones_unlocked.json");
const ZONES_TO_UNLOCK_PATH = path.resolve("data/zones_to_unlock.json");

export async function unlockRaidZone(
  zoneName: string,
  generation: number,
): Promise<string | null> {
  const genKey = `gen${generation}`;

  const unlockedRaw = await fs.readFile(ZONES_UNLOCKED_PATH, "utf-8");
  const unlocked = JSON.parse(unlockedRaw) as ZonesDb;

  const currentZones = unlocked[genKey] ?? [];
  const alreadyUnlocked = currentZones.some((z) => z.label === zoneName || z.id === zoneName);

  if (alreadyUnlocked) {
    logger.info(`[RAID] Zone "${zoneName}" déjà débloquée pour ${genKey}.`);
    return null;
  }

  const toUnlockRaw = await fs.readFile(ZONES_TO_UNLOCK_PATH, "utf-8");
  const toUnlock = JSON.parse(toUnlockRaw) as ZonesDb;

  const zonesToUnlock = toUnlock[genKey] ?? [];
  const zoneToAdd = zonesToUnlock.find((z) => z.label === zoneName || z.id === zoneName);

  if (!zoneToAdd) {
    logger.info(`[RAID] Zone "${zoneName}" introuvable dans zones_to_unlock pour ${genKey}.`);
    return null;
  }

  unlocked[genKey] = [...currentZones, zoneToAdd];
  await fs.writeFile(ZONES_UNLOCKED_PATH, JSON.stringify(unlocked, null, 2), "utf-8");

  toUnlock[genKey] = zonesToUnlock.filter((z) => z.id !== zoneToAdd.id);
  await fs.writeFile(ZONES_TO_UNLOCK_PATH, JSON.stringify(toUnlock, null, 2), "utf-8");

  logger.info(`[RAID] Zone "${zoneToAdd.label}" (${zoneToAdd.id}) débloquée pour ${genKey} et retirée de zones_to_unlock.`);
  return zoneToAdd.label;
}
