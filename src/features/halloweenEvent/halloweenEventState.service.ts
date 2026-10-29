import { mkdir, readFile, writeFile } from "node:fs/promises";
import { guildDir, halloweenEventStateDb } from "../../config/paths";

export interface HalloweenEventState {
  warningAnnounced: boolean;
  zoneOpenedAnnounced: boolean;
  endAnnounced: boolean;
  // Les données du concours (étape 5) s'ajouteront ici sous forme de champ
  // optionnel : les fichiers déjà écrits restent lisibles.
}

function createDefaultState(): HalloweenEventState {
  return {
    warningAnnounced: false,
    zoneOpenedAnnounced: false,
    endAnnounced: false,
  };
}

export async function loadHalloweenEventState(guildId: string): Promise<HalloweenEventState> {
  await mkdir(guildDir(guildId), { recursive: true });

  try {
    const raw = await readFile(halloweenEventStateDb(guildId), "utf-8");
    return { ...createDefaultState(), ...(JSON.parse(raw) as Partial<HalloweenEventState>) };
  } catch {
    return createDefaultState();
  }
}

export async function saveHalloweenEventState(
  guildId: string,
  state: HalloweenEventState,
): Promise<void> {
  await mkdir(guildDir(guildId), { recursive: true });
  await writeFile(halloweenEventStateDb(guildId), JSON.stringify(state, null, 2), "utf-8");
}
