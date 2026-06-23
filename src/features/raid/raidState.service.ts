import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createEmptyRaidState } from './createEmptyRaidState';
import { RaidState } from '../../types/raid/RaidState';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const RAID_STATE_FILE = path.join(DATA_DIR, 'raid.json');

export async function ensureRaidStateFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(RAID_STATE_FILE, 'utf-8');
  } catch {
    await saveRaidState(createEmptyRaidState());
  }
}

export async function loadRaidState(): Promise<RaidState> {
  await ensureRaidStateFile();

  try {
    const raw = await readFile(RAID_STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<RaidState>;

    return {
      ...createEmptyRaidState(),
      ...parsed,
      defenders: parsed.defenders ?? [],
      raidPokemon: parsed.raidPokemon ?? null,
      result: parsed.result ?? null,
      reward: parsed.reward ?? null,
    };
  } catch {
    return createEmptyRaidState();
  }
}

export async function saveRaidState(state: RaidState): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(RAID_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export async function resetRaidState(): Promise<RaidState> {
  const emptyState = createEmptyRaidState();
  await saveRaidState(emptyState);
  return emptyState;
}

export { RAID_STATE_FILE };