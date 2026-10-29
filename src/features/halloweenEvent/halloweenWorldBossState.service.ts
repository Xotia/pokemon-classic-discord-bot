import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { HALLOWEEN_WORLD_BOSS_DB } from "../../config/paths";

export interface HalloweenWorldBossState {
  openedDone: boolean;
  closedDone: boolean;
}

function createDefaultState(): HalloweenWorldBossState {
  return { openedDone: false, closedDone: false };
}

export async function loadHalloweenWorldBossState(): Promise<HalloweenWorldBossState> {
  try {
    const raw = await readFile(HALLOWEEN_WORLD_BOSS_DB, "utf-8");
    return { ...createDefaultState(), ...(JSON.parse(raw) as Partial<HalloweenWorldBossState>) };
  } catch {
    return createDefaultState();
  }
}

export async function saveHalloweenWorldBossState(state: HalloweenWorldBossState): Promise<void> {
  await mkdir(path.dirname(HALLOWEEN_WORLD_BOSS_DB), { recursive: true });
  await writeFile(HALLOWEEN_WORLD_BOSS_DB, JSON.stringify(state, null, 2), "utf-8");
}
