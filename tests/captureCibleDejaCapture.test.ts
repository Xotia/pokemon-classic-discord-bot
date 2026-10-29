import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// Toute l'I/O joueur est isolée dans un dossier temporaire.
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pokemon-classic-cible-"));
const guildDirOf = (guildId: string) => path.join(tmpRoot, guildId);

vi.mock("../src/config/paths", () => ({
  playersDb: (guildId: string) => path.join(guildDirOf(guildId), "players.json"),
  guildDir: (guildId: string) => guildDirOf(guildId),
  statsDb: (guildId: string) => path.join(guildDirOf(guildId), "stats.json"),
}));

vi.mock("../src/config/guilds", () => ({ ensureGuildDataFiles: vi.fn() }));
vi.mock("../src/config/guildSettings", () => ({ getCooldownMs: () => 30 * 60 * 1000 }));

vi.mock("../src/utils/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  getLoggerForGuild: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

const POKEMON = [
  { id: 1, name: "Bulbizarre", rarity: "common", generation: 1 },
  { id: 4, name: "Salamèche", rarity: "common", generation: 1 },
  { id: 7, name: "Carapuce", rarity: "common", generation: 1 },
  { id: 25, name: "Pikachu", rarity: "rare", generation: 1 },
];

vi.mock("../src/utils/pokemonCatalog", () => ({ getPokemonCatalog: () => POKEMON }));
vi.mock("../src/methods/zones/getZonePokemonIndex", () => ({
  getZonePokemonIds: () => new Set([1, 4, 7, 25]),
}));
vi.mock("../src/methods/zones/getGenerationByZone", () => ({
  getGenerationByZone: (_g: string, zone: string) => (zone === "pastoral-route" ? "gen1" : undefined),
}));
vi.mock("../src/methods/pokemon/isThisPokemonSameAsLastCapture", () => ({
  isThisPokemonSameAsLastCapture: async () => false,
}));
vi.mock("../src/methods/pokemon/isThePokemonGonnaBeShiny", () => ({
  isThePokemonGonnaBeShiny: () => false,
}));
vi.mock("../src/methods/pokemon/getCapturedPokemonHp", () => ({
  getCapturedPokemonHp: () => 100,
}));
vi.mock("../src/methods/xp/computeCaptureXp", () => ({ computeCaptureXp: () => 100 }));
vi.mock("../src/methods/stats/addAllStats", () => ({ addAllStats: vi.fn(async () => {}) }));
vi.mock("../src/methods/embed/buildCapturedPokemonEmbed", () => ({
  buildCapturedPokemonEmbed: ({ pokemon }: any) => ({
    embed: { data: { title: pokemon.name } },
    isInPokedex: false,
  }),
}));

import { readPlayers, writePlayers } from "../src/utils/jsonPlayers";
import { Player } from "../src/types/Player";
import { captureCibleCommand } from "../src/commands/captureCibleCommand";
import { captureCibleAdminCommand } from "../src/commands/captureCibleAdminCommand";
import { getRandomPokemonFromRarity } from "../src/methods/pokemon/getRandomPokemonFromRarity";

const GUILD = "cible-guild";
const ADMIN_ID = "admin-1";
const PLAYER_ID = "player-1";
const COMMON_COST = 3300;

function seed(players: Record<string, Partial<Player>>) {
  fs.mkdirSync(guildDirOf(GUILD), { recursive: true });
  return writePlayers(GUILD, players as Record<string, Player>);
}

function captured(...ids: number[]): Player["captureList"] {
  return Object.fromEntries(
    ids.map((id) => [String(id), { total: 1, shiny: 0, capturedInCurrentSeason: false }]),
  );
}

function userOf(id: string, name: string) {
  return { id, username: name, globalName: name, tag: `${name}#0` };
}

function buildInteraction(
  caller: { id: string; name: string },
  opts: Record<string, string | boolean | null>,
  targetUser?: ReturnType<typeof userOf>,
): any {
  return {
    guildId: GUILD,
    user: userOf(caller.id, caller.name),
    options: {
      getString: (n: string) => (opts[n] as string) ?? null,
      getBoolean: (n: string) => (opts[n] as boolean) ?? null,
      getUser: () => targetUser,
    },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  process.env.ADMIN_ID = ADMIN_ID;
  fs.rmSync(guildDirOf(GUILD), { recursive: true, force: true });
});
afterAll(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

describe("getRandomPokemonFromRarity : exclusion", () => {
  it("ne tire jamais un id exclu", () => {
    for (let i = 0; i < 40; i++) {
      const p = getRandomPokemonFromRarity(GUILD, "common", "gen1", "pastoral-route", new Set([1, 4]));
      expect(p?.id).toBe(7);
    }
  });

  it("retourne null quand tout est exclu", () => {
    expect(
      getRandomPokemonFromRarity(GUILD, "common", "gen1", "pastoral-route", new Set([1, 4, 7])),
    ).toBeNull();
  });

  it("sans exclusion, tout le pool reste tirable", () => {
    const ids = new Set<number>();
    for (let i = 0; i < 200; i++) {
      ids.add(getRandomPokemonFromRarity(GUILD, "common", "gen1", "pastoral-route")!.id);
    }
    expect(ids).toEqual(new Set([1, 4, 7]));
  });
});

describe("/capture-cible", () => {
  const caller = { id: PLAYER_ID, name: "Ash" };

  it("comportement habituel : débit du coût, XP créditée, cooldown consommé", async () => {
    await seed({ [PLAYER_ID]: { name: "Ash", researchData: 5000, xp: 0, level: 1 } });
    const before = Date.now();
    await captureCibleCommand(buildInteraction(caller, { zone: "pastoral-route", rarity: "common" }));

    const saved = (await readPlayers(GUILD))[PLAYER_ID];
    expect(saved.researchData).toBe(5000 - COMMON_COST + 100);
    expect(saved.lastCapture).toBeGreaterThanOrEqual(before);
  });

  it("deja_capture=false : ne donne que le Pokémon jamais capturé", async () => {
    for (let i = 0; i < 3; i++) {
      await seed({
        [PLAYER_ID]: { name: "Ash", researchData: 5000, captureList: captured(1, 4) },
      });
      await captureCibleCommand(
        buildInteraction(caller, { zone: "pastoral-route", rarity: "common", deja_capture: false }),
      );
      const saved = (await readPlayers(GUILD))[PLAYER_ID];
      expect(saved.captureList?.["7"]?.total).toBe(1);
    }
  });

  it("deja_capture=false et tout déjà capturé : annulé sans débit ni cooldown", async () => {
    await seed({
      [PLAYER_ID]: { name: "Ash", researchData: 5000, captureList: captured(1, 4, 7) },
    });
    const interaction = buildInteraction(caller, {
      zone: "pastoral-route",
      rarity: "common",
      deja_capture: false,
    });
    await captureCibleCommand(interaction);

    const msg: string = interaction.editReply.mock.calls[0][0];
    expect(msg).toBe(
      "Tu as déjà capturé les 3 Pokémon de rareté « Commun » de la zone « pastoral-route » : la capture ciblée est annulée et aucune donnée de recherche n'a été dépensée.",
    );
    const saved = (await readPlayers(GUILD))[PLAYER_ID];
    expect(saved.researchData).toBe(5000);
    expect(saved.lastCapture).toBeUndefined();
  });

  it("une entrée captureList avec total 0 ne compte pas comme capturée", async () => {
    await seed({
      [PLAYER_ID]: {
        name: "Ash",
        researchData: 5000,
        captureList: {
          "1": { total: 0, shiny: 0, capturedInCurrentSeason: false },
          "4": { total: 1, shiny: 0, capturedInCurrentSeason: false },
          "7": { total: 1, shiny: 0, capturedInCurrentSeason: false },
        },
      },
    });
    await captureCibleCommand(
      buildInteraction(caller, { zone: "pastoral-route", rarity: "common", deja_capture: false }),
    );
    expect((await readPlayers(GUILD))[PLAYER_ID].captureList?.["1"]?.total).toBe(1);
  });

  it("aucun Pokémon de la rareté dans la zone : message existant, sans débit", async () => {
    await seed({ [PLAYER_ID]: { name: "Ash", researchData: 999999 } });
    const interaction = buildInteraction(caller, {
      zone: "pastoral-route",
      rarity: "mythic",
      deja_capture: false,
    });
    await captureCibleCommand(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      "Aucun Pokémon de rareté « mythic » n'est disponible dans la zone « pastoral-route ».",
    );
    expect((await readPlayers(GUILD))[PLAYER_ID].researchData).toBe(999999);
  });
});

describe("/capture-cible-admin", () => {
  const admin = { id: ADMIN_ID, name: "Admin" };
  const target = userOf(PLAYER_ID, "Misty");

  it("refuse un non-admin, en éphémère, sans rien écrire", async () => {
    await seed({ [PLAYER_ID]: { name: "Misty", researchData: 10 } });
    const interaction = buildInteraction(
      { id: "intrus", name: "Intrus" },
      { zone: "pastoral-route", rarity: "common" },
      target,
    );
    await captureCibleAdminCommand(interaction);

    expect(interaction.reply).toHaveBeenCalledOnce();
    expect(interaction.reply.mock.calls[0][0]).toHaveProperty("flags");
    expect(interaction.deferReply).not.toHaveBeenCalled();
    const saved = (await readPlayers(GUILD))[PLAYER_ID];
    expect(saved.captureList).toBeUndefined();
  });

  it("offre la capture au joueur ciblé : données de recherche et cooldown intacts", async () => {
    await seed({
      [PLAYER_ID]: { name: "Misty", researchData: 42, lastCapture: 12345, xp: 0, level: 1 },
      [ADMIN_ID]: { name: "Admin", researchData: 7 },
    });
    const interaction = buildInteraction(admin, { zone: "pastoral-route", rarity: "common" }, target);
    await captureCibleAdminCommand(interaction);

    const players = await readPlayers(GUILD);
    expect(players[PLAYER_ID].researchData).toBe(42);
    expect(players[PLAYER_ID].lastCapture).toBe(12345);
    expect(players[PLAYER_ID].xp).toBe(100);
    expect(Object.keys(players[PLAYER_ID].captureList ?? {})).toHaveLength(1);
    // L'admin n'est ni crédité ni touché par le cooldown.
    expect(players[ADMIN_ID].researchData).toBe(7);
    expect(players[ADMIN_ID].lastCapture).toBeUndefined();
    expect(players[ADMIN_ID].captureList).toBeUndefined();

    const reply = interaction.editReply.mock.calls[0][0];
    expect(reply.content).toBe(`<@${PLAYER_ID}>`);
    expect(reply.embeds).toHaveLength(1);
  });

  it("crée le profil du joueur ciblé s'il n'existe pas, et lui donne le Pokémon", async () => {
    await seed({});
    await captureCibleAdminCommand(
      buildInteraction(admin, { zone: "pastoral-route", rarity: "common" }, target),
    );
    const players = await readPlayers(GUILD);
    expect(players[ADMIN_ID]).toBeUndefined();
    expect(players[PLAYER_ID].name).toBe("Misty");
    expect(players[PLAYER_ID].researchData).toBe(0);
    expect(Object.keys(players[PLAYER_ID].captureList ?? {})).toHaveLength(1);
  });

  it("deja_capture=false : pool vide annule la capture cadeau", async () => {
    await seed({ [PLAYER_ID]: { name: "Misty", researchData: 42, captureList: captured(1, 4, 7) } });
    const interaction = buildInteraction(
      admin,
      { zone: "pastoral-route", rarity: "common", deja_capture: false },
      target,
    );
    await captureCibleAdminCommand(interaction);

    expect(interaction.editReply.mock.calls[0][0]).toContain("Tu as déjà capturé les 3 Pokémon");
    const saved = (await readPlayers(GUILD))[PLAYER_ID];
    expect(saved.researchData).toBe(42);
    expect(Object.keys(saved.captureList ?? {})).toHaveLength(3);
  });
});
