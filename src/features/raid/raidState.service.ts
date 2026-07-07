import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createEmptyRaidState } from './createEmptyRaidState';
import { RaidState } from '../../types/raid/RaidState';
import { guildDir, raidStateDb } from '../../config/paths';

export async function ensureRaidStateFile(guildId: string): Promise<void> {
  await mkdir(guildDir(guildId), { recursive: true });

  try {
    await readFile(raidStateDb(guildId), 'utf-8');
  } catch {
    await saveRaidState(guildId, createEmptyRaidState());
  }
}

export async function loadRaidState(guildId: string): Promise<RaidState> {
  await ensureRaidStateFile(guildId);

  try {
    const raw = await readFile(raidStateDb(guildId), 'utf-8');
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

export async function saveRaidState(guildId: string, state: RaidState): Promise<void> {
  await mkdir(guildDir(guildId), { recursive: true });
  await writeFile(raidStateDb(guildId), JSON.stringify(state, null, 2), 'utf-8');
}

export async function resetRaidState(guildId: string): Promise<RaidState> {
  const emptyState = createEmptyRaidState();
  await saveRaidState(guildId, emptyState);
  return emptyState;
}