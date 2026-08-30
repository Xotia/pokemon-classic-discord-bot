import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// Toute l'I/O joueur est isolée dans un dossier temporaire : ce test ne lit
// et n'écrit jamais dans data/guilds/.
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pokemon-classic-cheat-"));

function guildDir(guildId: string): string {
  return path.join(tmpRoot, guildId);
}

function playersDb(guildId: string): string {
  return path.join(guildDir(guildId), "players.json");
}

vi.mock("../src/config/paths", () => ({
  playersDb: (guildId: string) => playersDb(guildId),
  guildDir: (guildId: string) => guildDir(guildId),
  statsDb: (guildId: string) => path.join(guildDir(guildId), "stats.json"),
}));

vi.mock("../src/utils/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  getLoggerForGuild: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock("../src/methods/player/createProfileIfNeeded", () => ({
  createProfileIfNeeded: vi.fn(),
}));

vi.mock("../src/methods/stats/addAllStats", () => ({
  addAllStats: vi.fn(async () => {}),
}));

vi.mock("../src/methods/pokedex/isPokemonInPokedex", () => ({
  isPokemonInPokedex: () => false,
}));

vi.mock("../src/methods/embed/buildCapturedPokemonEmbed", () => ({
  buildCapturedPokemonEmbed: () => ({
    embed: { fake: "embed" },
    footer: "",
    isInPokedex: false,
  }),
}));

const LAGGRON = { id: 260, name: "Laggron", rarity: "rare" };

vi.mock("../src/methods/pokemon/getPokemonByName", () => ({
  getPokemonByName: async (_guildId: string, name: string) =>
    name.toLowerCase() === "laggron" ? LAGGRON : null,
}));

import { cheatCommand } from "../src/commands/cheatCommand";

const GUILD_ID = "cheat-guild";
const OWNER_ID = "owner-1";
const TARGET_ID = "target-1";

function seedPlayer(): void {
  fs.mkdirSync(guildDir(GUILD_ID), { recursive: true });
  fs.writeFileSync(
    playersDb(GUILD_ID),
    JSON.stringify({ [TARGET_ID]: { name: "Xotia", xp: 0, level: 1 } }, null, 2),
    "utf8",
  );
}

function readTargetCaptureList(): Record<string, any> {
  const players = JSON.parse(fs.readFileSync(playersDb(GUILD_ID), "utf8"));
  return players[TARGET_ID].captureList ?? {};
}

function buildInteraction(shiny: boolean) {
  const options: Record<string, string | boolean> = {
    player: "Xotia",
    pokemon: "Laggron",
    shiny,
  };

  return {
    guildId: GUILD_ID,
    user: { id: OWNER_ID, username: "owner", globalName: "Owner" },
    options: {
      getString: (name: string) => options[name] as string,
      getBoolean: (name: string) => options[name] as boolean,
    },
    deferReply: vi.fn(async () => {}),
    reply: vi.fn(async () => {}),
    editReply: vi.fn(async () => {}),
  };
}

describe("cheatCommand - persistance de la capture", () => {
  beforeEach(() => {
    process.env.ADMIN_ID = OWNER_ID;
    seedPlayer();
  });

  afterEach(() => {
    fs.rmSync(guildDir(GUILD_ID), { recursive: true, force: true });
  });

  it("persiste capturedInCurrentSeason à true (régression)", async () => {
    await cheatCommand(buildInteraction(false));

    expect(readTargetCaptureList()["260"]).toEqual({
      total: 1,
      shiny: 0,
      capturedInCurrentSeason: true,
    });
  });

  it("n'incrémente le total qu'une fois par appel", async () => {
    await cheatCommand(buildInteraction(false));
    await cheatCommand(buildInteraction(true));

    expect(readTargetCaptureList()["260"]).toEqual({
      total: 2,
      shiny: 1,
      capturedInCurrentSeason: true,
    });
  });
});
