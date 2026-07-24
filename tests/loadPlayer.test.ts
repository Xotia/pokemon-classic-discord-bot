import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// Isolate all player file I/O to a throwaway temp directory so this test
// never reads or writes anything under the real data/guilds/ tree.
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pokemon-classic-loadplayer-"));

function guildDir(guildId: string): string {
  return path.join(tmpRoot, guildId);
}

function playersDb(guildId: string): string {
  return path.join(guildDir(guildId), "players.json");
}

vi.mock("../src/config/paths", () => ({
  playersDb: (guildId: string) => playersDb(guildId),
  guildDir: (guildId: string) => guildDir(guildId),
}));

vi.mock("../src/utils/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  getLoggerForGuild: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

import { getPlayer } from "../src/utils/loadPlayer";
import { updatePlayer } from "../src/utils/jsonPlayers";
import { Player } from "../src/types/Player";

const GUILD_ID = "characterization-guild";
const USER_ID = "characterization-user";
const T0 = 1_000_000;
const T1 = 1_000_900_000;

function seedPlayer(lastCapture: number): void {
  fs.mkdirSync(guildDir(GUILD_ID), { recursive: true });
  const player: Partial<Player> & { lastCapture: number } = {
    name: "TestTrainer",
    xp: 0,
    level: 1,
    pityCounter: 0,
    lastCapture,
  };
  fs.writeFileSync(
    playersDb(GUILD_ID),
    JSON.stringify({ [USER_ID]: player }, null, 2),
    "utf8"
  );
}

describe("getPlayer (loadPlayer.ts) - no stale in-memory cache", () => {
  beforeEach(() => {
    fs.mkdirSync(guildDir(GUILD_ID), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(guildDir(GUILD_ID), { recursive: true, force: true });
  });

  it("reflects a concurrent lastCapture update on disk instead of returning a stale cached copy", async () => {
    seedPlayer(T0);

    // First read: in the pre-fix world with a 2-minute in-memory cache,
    // this call would have poisoned the cache with the T0 snapshot.
    const first = getPlayer(GUILD_ID, USER_ID);
    expect(first?.lastCapture).toBe(T0);

    // Simulate checkIfUserCanCatch.ts writing the fresh lastCapture to disk,
    // using the real updatePlayer helper to mirror production code.
    await updatePlayer(GUILD_ID, USER_ID, (player) => {
      (player as any).lastCapture = T1;
    });

    // Second read must see the fresh value, not the T0 value cached earlier.
    const second = getPlayer(GUILD_ID, USER_ID);
    expect(second?.lastCapture).toBe(T1);
  });

  it("does not let a stale getPlayer snapshot clobber a concurrent lastCapture update via updatePlayer's read-modify-write", async () => {
    seedPlayer(T0);

    // Step 2 equivalent: an earlier command (e.g. /pity, /pokedex) calls
    // getPlayer first. In the pre-fix world with a 2-minute in-memory
    // cache, this call would poison the cache with the T0 snapshot.
    const earlierRead = getPlayer(GUILD_ID, USER_ID);
    expect(earlierRead?.lastCapture).toBe(T0);

    // Step 1 equivalent: checkIfUserCanCatch.ts concurrently writes the
    // fresh lastCapture to disk after the cache-poisoning read above.
    await updatePlayer(GUILD_ID, USER_ID, (player) => {
      (player as any).lastCapture = T1;
    });

    // Step 2 (continued): getCapturePlayer.ts then calls getPlayer again to
    // obtain the player object used for the rest of the capture flow.
    // Pre-fix, this would return the cached T0 snapshot instead of T1.
    const captureFlowPlayer = getPlayer(GUILD_ID, USER_ID);
    expect(captureFlowPlayer?.lastCapture).toBe(T1);

    // Step 3 equivalent: the capture flow persists its own changes via
    // updatePlayer's read-modify-write (post-fix persistence path), which
    // re-reads from disk instead of overwriting with a stale in-memory
    // snapshot, so the concurrently-written T1 lastCapture survives.
    await updatePlayer(GUILD_ID, USER_ID, (fresh) => {
      (fresh as any).xp = (fresh as any).xp ?? 0;
    });

    const onDisk = JSON.parse(fs.readFileSync(playersDb(GUILD_ID), "utf8"));
    expect(onDisk[USER_ID].lastCapture).toBe(T1);
  });
});
