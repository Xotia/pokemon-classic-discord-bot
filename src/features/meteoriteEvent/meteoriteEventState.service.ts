import { mkdir, readFile, writeFile } from "node:fs/promises";
import { guildDir, meteoriteEventStateDb } from "../../config/paths";

interface MeteoriteEventState {
  warningAnnounced: boolean;
  zoneOpenedAnnounced: boolean;
  zoneClosedAnnounced: boolean;
  checkpointsFired: Record<number, { opened: boolean; closed: boolean }>;
}

function createDefaultState(): MeteoriteEventState {
  return {
    warningAnnounced: false,
    zoneOpenedAnnounced: false,
    zoneClosedAnnounced: false,
    checkpointsFired: {},
  };
}

export async function loadMeteoriteEventState(guildId: string): Promise<MeteoriteEventState> {
  await mkdir(guildDir(guildId), { recursive: true });

  try {
    const raw = await readFile(meteoriteEventStateDb(guildId), "utf-8");
    return { ...createDefaultState(), ...(JSON.parse(raw) as Partial<MeteoriteEventState>) };
  } catch {
    return createDefaultState();
  }
}

export async function saveMeteoriteEventState(
  guildId: string,
  state: MeteoriteEventState,
): Promise<void> {
  await mkdir(guildDir(guildId), { recursive: true });
  await writeFile(meteoriteEventStateDb(guildId), JSON.stringify(state, null, 2), "utf-8");
}
