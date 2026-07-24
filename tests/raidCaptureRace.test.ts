import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { Player } from "../src/types/Player";

// Isolate all player file I/O to a throwaway temp directory, same pattern as
// tests/loadPlayer.test.ts, so this test never touches data/guilds/.
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pokemon-classic-raidcapturerace-"));

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

// Everything below is unrelated to the players.json race we are pinning
// (embeds, discord logging, shiny roll, pokedex/catalog lookups, misc
// stats.json bookkeeping). Stub it out so the test is deterministic and
// isolated to the players.json read-modify-write race itself.
vi.mock("../src/methods/pokemon/isThePokemonGonnaBeShiny", () => ({
  isThePokemonGonnaBeShiny: () => false,
}));

vi.mock("../src/methods/pokemon/getCapturedPokemonHp", () => ({
  getCapturedPokemonHp: () => 50,
}));

vi.mock("../src/methods/embed/buildCapturedPokemonEmbed", () => ({
  buildCapturedPokemonEmbed: () => ({ embed: {}, footer: "footer", isInPokedex: true }),
}));

vi.mock("../src/methods/console-logs/displayLogs", () => ({
  displayLogs: () => {},
}));

vi.mock("../src/methods/pokemon/getPokemonById", () => ({
  getPokemonById: () => ({ id: 99, name: "RaidBoss", rarity: "rare" }),
}));

// Shared mutable state read/written by the addAllStats mock below. Declared
// via vi.hoisted so it is safe to reference from inside a hoisted vi.mock
// factory (the factory itself runs eagerly at module-init time, but the
// inner async implementation only runs later, at call time in the test).
const raceState = vi.hoisted(() => ({
  guildId: "",
  userId: "",
  capturePlayerSnapshot: null as Player | null,
  triggered: false,
}));

// This is the crux of the interleaving mechanism: applyRaidRewards awaits
// addAllStats() *between* its players.json read and its players.json write
// (see src/features/raid/applyRaidRewards.ts:63-71). We hijack that real
// await point to run a full, real /capture completion (including its own
// full read-modify-write of players.json) for the very same player, before
// letting control return to applyRaidRewards so it performs its own write.
// This reproduces, with the real production code paths, the exact race
// described in the diagnosis: whichever write lands last wins and silently
// destroys the other write's changes.
vi.mock("../src/methods/stats/addAllStats", () => ({
  addAllStats: vi.fn(async () => {
    if (raceState.triggered) return;
    raceState.triggered = true;

    const { handleSuccessfulCapture } = await import(
      "../src/methods/pokemon/handleSuccessfulCapture"
    );

    const fakeInteraction = {
      user: { id: raceState.userId },
      editReply: vi.fn().mockResolvedValue(undefined),
    };

    const pokemonCatched = { id: 1, name: "Bulbasaur", rarity: "common" };

    // Runs handleSuccessfulCapture to full completion, including its own
    // savePlayerData() full-file write, while applyRaidRewards is still
    // sitting on its in-memory `players` snapshot from before this call.
    await handleSuccessfulCapture(
      fakeInteraction,
      raceState.guildId,
      raceState.capturePlayerSnapshot,
      pokemonCatched,
      "common",
      "verdant-plain",
    );
  }),
}));

import { applyRaidRewards } from "../src/features/raid/applyRaidRewards";

const GUILD_ID = "raid-capture-race-guild";
const USER_ID = "shared-user";

function seedPlayers(): void {
  fs.mkdirSync(guildDir(GUILD_ID), { recursive: true });
  const baseline: Player = {
    name: "Ash",
    xp: 0,
    level: 1,
    pityCounter: 3,
    raidWins: 1,
    captureList: {
      "42": { total: 1, shiny: 0, capturedInCurrentSeason: false },
    },
  };
  fs.writeFileSync(
    playersDb(GUILD_ID),
    JSON.stringify({ [USER_ID]: baseline }, null, 2),
    "utf8",
  );
}

function readPersistedPlayer(): any {
  const raw = fs.readFileSync(playersDb(GUILD_ID), "utf8");
  return JSON.parse(raw)[USER_ID];
}

function buildRaidState(): any {
  return {
    raidId: "raid-1",
    status: "resolved",
    createdAt: null,
    registrationOpensAt: null,
    registrationClosesAt: null,
    resolvedAt: null,
    generation: 1,
    zone: "verdant-plain",
    raidPokemon: {
      id: 99,
      name: "RaidBoss",
      difficulty: 1,
      types: ["normal"],
      attackType: "physical",
      baseStats: { hp: 100, attack: 1, defense: 1, spAttack: 1, spDefense: 1, speed: 1 },
      finalStats: { hp: 100, attack: 1, defense: 1, spAttack: 1, spDefense: 1, speed: 1 },
      defenseEffectiveness: {},
      zone: "verdant-plain",
    },
    defenders: [
      {
        userId: USER_ID,
        pokemonId: 1,
        pokemonName: "Bulbasaur",
        attackType: "physical",
        registeredAt: new Date().toISOString(),
        snapshot: { types: [], defenseEffectiveness: {}, stats: { hp: 1, attack: 1, defense: 1, spAttack: 1, spDefense: 1, speed: 1 } },
      },
    ],
    result: {
      success: true,
      missingStats: [],
      participantsCount: 1,
      teamStats: { hp: 1, attack: 1, defense: 1, spAttack: 1, spDefense: 1, speed: 1 },
      statDiffs: { hp: 1, attack: 1, defense: 1, spAttack: 1, spDefense: 1, speed: 1 },
    },
    reward: null,
  };
}

describe("raid reward / capture race on players.json (lost update)", () => {
  beforeEach(() => {
    fs.mkdirSync(guildDir(GUILD_ID), { recursive: true });
    raceState.guildId = GUILD_ID;
    raceState.userId = USER_ID;
    raceState.triggered = false;
    seedPlayers();
    // Snapshot the player exactly as captureCommand.ts:33 would have,
    // *before* either the raid or the capture flow mutates anything -
    // this mirrors the real bug where the capture's `player` object is
    // captured before several `await`s and never re-read from disk.
    const seeded = readPersistedPlayer();
    raceState.capturePlayerSnapshot = { ...seeded, captureList: { ...seeded.captureList } };
  });

  afterEach(() => {
    fs.rmSync(guildDir(GUILD_ID), { recursive: true, force: true });
  });

  it("does not let the raid reward write and the capture write clobber each other for the same player", async () => {
    const state = buildRaidState();

    const reward = await applyRaidRewards(state, GUILD_ID);

    // Sanity: the raid did resolve successfully and did register the
    // capture-triggering hijack exactly once.
    expect(reward.raidWin).toBe(true);
    expect(raceState.triggered).toBe(true);

    const persisted = readPersistedPlayer();

    // Raid-side changes: xp gain from the raid, raidWins increment, and the
    // raid-captured Pokémon registered against this player (this player was
    // both a defender and the lucky winner in this scenario).
    expect(persisted.raidWins).toBe(2);
    expect(persisted.captureList["99"]).toBeDefined();
    expect(persisted.captureList["99"].total).toBe(1);

    // Capture-side changes: the /capture completed concurrently for the
    // same player and should also be reflected - its own xp gain and its
    // own captured Pokémon (id 1) registered in captureList.
    expect(persisted.captureList["1"]).toBeDefined();
    expect(persisted.captureList["1"].total).toBe(1);

    // The player's original captureList entry (unrelated to either flow)
    // must survive both writes.
    expect(persisted.captureList["42"]).toBeDefined();
    expect(persisted.captureList["42"].total).toBe(1);

    // xp must reflect BOTH the raid reward (bossHp 100 * 10 = 1000) and the
    // capture's gain (baseXp 50, not shiny) on top of the baseline of 0.
    // Under the lost-update bug, whichever write lands last (the raid
    // write, since it happens after the capture flow completes inside the
    // hijacked addAllStats await) wins outright and the other's xp/captureList
    // changes are silently discarded instead of merged.
    expect(persisted.xp).toBe(1050);
  });
});
