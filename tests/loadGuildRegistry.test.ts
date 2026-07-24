import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// Isolate the registry file I/O to a throwaway temp file so this test never
// reads or writes the real data/guilds.json.
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pokemon-classic-guildregistry-"));
const REGISTRY_PATH = path.join(tmpRoot, "guilds.json");

vi.mock("../src/config/paths", () => ({
  GUILDS_REGISTRY: REGISTRY_PATH,
}));

function writeRegistry(guilds: unknown[]): void {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify({ guilds }, null, 2), "utf8");
}

// loadGuildRegistry() caches its parsed result in a module-scope variable
// (cachedRegistry), so each test must re-import the module fresh to avoid
// bleeding state between cases.
async function importFreshLoadGuildRegistry() {
  vi.resetModules();
  const mod = await import("../src/config/guilds");
  return mod.loadGuildRegistry;
}

describe("loadGuildRegistry (src/config/guilds.ts)", () => {
  afterEach(() => {
    if (fs.existsSync(REGISTRY_PATH)) {
      fs.rmSync(REGISTRY_PATH, { force: true });
    }
  });

  it("accepte une entrée avec seulement les 3 champs obligatoires (devChannelId/loreChannelId absents)", async () => {
    writeRegistry([
      {
        guildId: "guild-1",
        name: "Guild One",
        raidAnnounceChannelId: "raid-chan-1",
        mainChannelId: "main-chan-1",
      },
    ]);

    const loadGuildRegistry = await importFreshLoadGuildRegistry();

    const registry = loadGuildRegistry();
    expect(registry).toHaveLength(1);
    expect(registry[0]).toEqual({
      guildId: "guild-1",
      name: "Guild One",
      raidAnnounceChannelId: "raid-chan-1",
      mainChannelId: "main-chan-1",
    });
  });

  it("lève une erreur si guildId est absent", async () => {
    writeRegistry([
      {
        name: "Guild No Id",
        raidAnnounceChannelId: "raid-chan-1",
        mainChannelId: "main-chan-1",
      },
    ]);

    const loadGuildRegistry = await importFreshLoadGuildRegistry();

    expect(() => loadGuildRegistry()).toThrow(
      /guildId, raidAnnounceChannelId et mainChannelId sont requis/,
    );
  });

  it("lève une erreur si raidAnnounceChannelId est absent", async () => {
    writeRegistry([
      {
        guildId: "guild-2",
        name: "Guild No Raid Channel",
        mainChannelId: "main-chan-2",
      },
    ]);

    const loadGuildRegistry = await importFreshLoadGuildRegistry();

    expect(() => loadGuildRegistry()).toThrow(
      /guildId, raidAnnounceChannelId et mainChannelId sont requis/,
    );
  });

  it("lève une erreur si mainChannelId est absent (nouveau champ obligatoire)", async () => {
    writeRegistry([
      {
        guildId: "guild-3",
        name: "Guild No Main Channel",
        raidAnnounceChannelId: "raid-chan-3",
      },
    ]);

    const loadGuildRegistry = await importFreshLoadGuildRegistry();

    expect(() => loadGuildRegistry()).toThrow(
      /guildId, raidAnnounceChannelId et mainChannelId sont requis/,
    );
  });

  it("accepte une entrée avec les 3 champs obligatoires plus devChannelId et loreChannelId", async () => {
    writeRegistry([
      {
        guildId: "guild-4",
        name: "Guild Full",
        raidAnnounceChannelId: "raid-chan-4",
        mainChannelId: "main-chan-4",
        devChannelId: "dev-chan-4",
        loreChannelId: "lore-chan-4",
      },
    ]);

    const loadGuildRegistry = await importFreshLoadGuildRegistry();

    const registry = loadGuildRegistry();
    expect(registry).toHaveLength(1);
    expect(registry[0]).toEqual({
      guildId: "guild-4",
      name: "Guild Full",
      raidAnnounceChannelId: "raid-chan-4",
      mainChannelId: "main-chan-4",
      devChannelId: "dev-chan-4",
      loreChannelId: "lore-chan-4",
    });
  });
});
