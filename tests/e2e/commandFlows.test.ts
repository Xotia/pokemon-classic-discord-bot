/**
 * E2E characterization tests — command flows
 *
 * Scope: pin observable behavior of command handlers against a temporary,
 *        isolated guild folder (e2e-test-guild).  No real Discord network.
 *
 * Removal condition: retire after the release/3.5.0 → main merge and replace
 *                    with specified-behavior tests on the new structure.
 *
 * PINNED BUGS: none found at time of authoring.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import fs from "fs";

// ─── mocks (hoisted by vitest before any import) ────────────────────────────

vi.mock("../../src/utils/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  getLoggerForGuild: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock("../../src/methods/pokemon/isThePokemonGonnaBeShiny", () => ({
  isThePokemonGonnaBeShiny: vi.fn().mockReturnValue(false),
}));

vi.mock("../../src/methods/pokemon/getCapturedPokemonHp", () => ({
  getCapturedPokemonHp: vi.fn().mockReturnValue(100),
}));

vi.mock("../../src/methods/embed/buildCapturedPokemonEmbed", () => ({
  buildCapturedPokemonEmbed: vi.fn().mockReturnValue({
    // Not an EmbedBuilder instance intentionally — the `instanceof` guard in
    // handleTargetedCapture skips setTitle/addFields, which is fine here.
    embed: {
      data: { title: "Bulbasaur" },
      setTitle: vi.fn().mockReturnThis(),
      addFields: vi.fn().mockReturnThis(),
    },
    footer: "test-footer",
    isInPokedex: false,
  }),
}));

vi.mock("../../src/methods/stats/addAllStats", () => ({
  addAllStats: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/methods/console-logs/displayLogs", () => ({
  displayLogs: vi.fn(),
}));

vi.mock("../../src/methods/rarity/getPokemonByRarity", () => ({
  getPokemonByRarity: vi.fn().mockResolvedValue({
    pokemonCatched: { id: 1, name: "Bulbasaur", rarity: "common", image: "", shinyImage: "" },
    rarity: "common",
  }),
}));

vi.mock("../../src/methods/cooldown/checkIfUserCanCatch", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/methods/cooldown/checkIfUserCanCatch")>();
  return { ...actual, checkIfUserCanCatch: vi.fn().mockResolvedValue(true) };
});

vi.mock("../../src/methods/pokemon/tryCatchPokemon", () => ({
  tryCatchPokemon: vi.fn().mockResolvedValue({
    pokemonCatched: { id: 1, name: "Bulbasaur", rarity: "common", image: "", shinyImage: "" },
    rarity: "common",
  }),
}));

vi.mock("../../src/methods/zones/logCaptureLocationSelection", () => ({
  logCaptureLocationSelection: vi.fn(),
}));

vi.mock("../../src/methods/zones/resolveCaptureLocation", () => ({
  resolveCaptureLocation: vi.fn().mockResolvedValue({
    generation: "gen1",
    zone: "pastoral-route",
    selectedZone: { id: "pastoral-route", label: "Route bucolique" },
    isGenerationChosenByUser: false,
    isGenerationInferredFromZone: false,
    isGenerationRandom: true,
    isZoneRandom: true,
  }),
}));

vi.mock("../../src/methods/embed/buildPokedexPageEmbed", () => ({
  buildPokedexPageEmbed: vi.fn().mockResolvedValue({ data: { title: "Pokédex" } }),
}));

vi.mock("../../src/methods/pokedex/buildPokedexButtons", () => ({
  buildPokedexButtons: vi.fn().mockReturnValue([]),
}));

vi.mock("../../src/methods/pokedex/buildDisabledPokedexButtons", () => ({
  buildDisabledPokedexButtons: vi.fn().mockReturnValue([]),
}));

// ─── production imports (after mocks) ───────────────────────────────────────

import { ensureGuildDataFiles } from "../../src/config/guilds";
import { readPlayers, writePlayers } from "../../src/utils/jsonPlayers";
import { guildDir } from "../../src/config/paths";
import { Player } from "../../src/types/Player";
import { createProfileIfNeeded } from "../../src/methods/player/createProfileIfNeeded";
import { handleSuccessfulCapture } from "../../src/methods/pokemon/handleSuccessfulCapture";
import { handleTargetedCapture } from "../../src/methods/research/handleTargetedCapture";
import { captureCibleCommand } from "../../src/commands/captureCibleCommand";
import { getPity } from "../../src/commands/getPityCommand";
import { pokedexCommand } from "../../src/commands/pokedexCommand";
import { checkIfUserCanCatch } from "../../src/methods/cooldown/checkIfUserCanCatch";
import { captureCommand } from "../../src/commands/captureCommand";
import { tryCatchPokemon } from "../../src/methods/pokemon/tryCatchPokemon";
import { resolveCaptureLocation } from "../../src/methods/zones/resolveCaptureLocation";

// ─── constants ───────────────────────────────────────────────────────────────

const GUILD_ID = "e2e-test-guild";
const USER_ID = "user-e2e-001";
const USERNAME = "Ash";

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildInteraction(opts: {
  guildId?: string | null;
  userId?: string;
  username?: string;
  options?: Record<string, string | number | null>;
} = {}): any {
  const {
    guildId = GUILD_ID,
    userId = USER_ID,
    username = USERNAME,
    options = {},
  } = opts;

  return {
    guildId,
    user: {
      id: userId,
      username,
      globalName: username,
      tag: `${username}#0000`,
      displayName: username,
    },
    options: {
      getString: (name: string) => (options[name] as string) ?? null,
      getInteger: (name: string) => (options[name] as number) ?? null,
    },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
    fetchReply: vi.fn().mockResolvedValue({
      createMessageComponentCollector: vi.fn().mockReturnValue({ on: vi.fn() }),
      edit: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

async function seedPlayer(
  userId: string,
  data: Partial<Player> & { name: string },
): Promise<void> {
  const players = await readPlayers(GUILD_ID);
  players[userId] = {
    pityCounter: 0,
    xp: 0,
    level: 1,
    researchData: 0,
    captureList: {},
    ...data,
  };
  await writePlayers(GUILD_ID, players);
}

async function clearPlayers(): Promise<void> {
  await writePlayers(GUILD_ID, {});
}

// ─── test suite ──────────────────────────────────────────────────────────────

describe("E2E command flows (isolated guild: e2e-test-guild)", () => {
  beforeAll(() => {
    // Creates players.json, stats.json, zones_unlocked.json, etc.
    ensureGuildDataFiles(GUILD_ID);
    // Provide fallback env values used by guildSettings when guild is not in
    // the registry (e2e-test-guild is intentionally absent from guilds.json).
    process.env.PITY_THRESHOLD = "10";
    process.env.COOLDOWN = "30";
    process.env.POKEMON_PER_PAGE = "20";
  });

  afterAll(() => {
    fs.rmSync(guildDir(GUILD_ID), { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Reset call counts between tests; implementations remain from vi.mock().
    vi.clearAllMocks();
    await clearPlayers();
  });

  // ── Flow 1a: profile creation ────────────────────────────────────────────

  describe("createProfileIfNeeded", () => {
    it("creates a new profile when the user is unknown", async () => {
      const interaction = buildInteraction();

      createProfileIfNeeded(interaction, GUILD_ID);

      const players = await readPlayers(GUILD_ID);
      expect(players[USER_ID]).toBeDefined();
      expect(players[USER_ID].name).toBe(USERNAME);
      expect(players[USER_ID].xp).toBe(0);
      expect(players[USER_ID].pityCounter).toBe(0);
      expect(players[USER_ID].researchData).toBe(0);
      expect(players[USER_ID].level).toBe(1);
    });

    it("does not overwrite an existing profile (idempotent)", async () => {
      await seedPlayer(USER_ID, { name: USERNAME, xp: 500, level: 3, researchData: 1000 });

      const interaction = buildInteraction();
      createProfileIfNeeded(interaction, GUILD_ID);

      const players = await readPlayers(GUILD_ID);
      // Profile must survive with its existing values intact.
      expect(players[USER_ID].xp).toBe(500);
      expect(players[USER_ID].level).toBe(3);
      expect(players[USER_ID].researchData).toBe(1000);
    });
  });

  // ── Flow 1b: normal capture rewards (handleSuccessfulCapture) ────────────

  describe("handleSuccessfulCapture", () => {
    it("increments xp, researchData, and captureList in the JSON file", async () => {
      await seedPlayer(USER_ID, { name: USERNAME, xp: 0, level: 1, researchData: 0, pityCounter: 2 });

      const interaction = buildInteraction();
      const player = { name: USERNAME, pityCounter: 2, xp: 0, level: 1, researchData: 0, captureList: {} };
      const pokemon = { id: 1, name: "Bulbasaur", rarity: "common", image: "", shinyImage: "" };

      await handleSuccessfulCapture(interaction, GUILD_ID, player, pokemon, "common", "pastoral-route");

      const players = await readPlayers(GUILD_ID);
      const saved = players[USER_ID];

      // getCapturedPokemonHp mocked to 100; not shiny → gainedXp = 100
      expect(saved.xp).toBe(100);
      expect(saved.researchData).toBe(100);
      expect(saved.pityCounter).toBe(2);          // pity preserved as-is
      expect(saved.captureList?.["1"]?.total).toBe(1);
      expect(saved.captureList?.["1"]?.shiny).toBe(0);
      expect(saved.captureList?.["1"]?.capturedInCurrentSeason).toBe(true);
    });

    it("accumulates researchData across multiple captures of the same pokemon", async () => {
      // Both the JSON (fresh source for updatePlayer) and the in-memory player
      // must reflect the prior capture so the increments compound correctly.
      const priorCaptureList = { "1": { total: 1, shiny: 0, capturedInCurrentSeason: true } };
      await seedPlayer(USER_ID, {
        name: USERNAME,
        xp: 100,
        level: 5,
        researchData: 100,
        captureList: priorCaptureList,
      });

      const interaction = buildInteraction();
      const player = {
        name: USERNAME,
        pityCounter: 0,
        xp: 100,
        level: 5,
        researchData: 100,
        captureList: { "1": { total: 1, shiny: 0, capturedInCurrentSeason: true } },
      };
      const pokemon = { id: 1, name: "Bulbasaur", rarity: "common", image: "", shinyImage: "" };

      await handleSuccessfulCapture(interaction, GUILD_ID, player, pokemon, "common", "pastoral-route");

      const players = await readPlayers(GUILD_ID);
      const saved = players[USER_ID];

      // Second capture: researchData 100 → 100 + 100 = 200;
      // captureList["1"].total: JSON starts at 1, incremented to 2.
      expect(saved.researchData).toBe(200);
      expect(saved.captureList?.["1"]?.total).toBe(2);
    });

    it("calls interaction.editReply with an embed", async () => {
      await seedPlayer(USER_ID, { name: USERNAME });
      const interaction = buildInteraction();
      const player = { name: USERNAME, pityCounter: 0, xp: 0, level: 1, researchData: 0, captureList: {} };
      const pokemon = { id: 1, name: "Bulbasaur", rarity: "common", image: "", shinyImage: "" };

      await handleSuccessfulCapture(interaction, GUILD_ID, player, pokemon, "common", "pastoral-route");

      expect(interaction.editReply).toHaveBeenCalledOnce();
      const arg = interaction.editReply.mock.calls[0][0];
      expect(arg).toHaveProperty("embeds");
      expect(Array.isArray(arg.embeds)).toBe(true);
    });
  });

  // ── Flow 2a: targeted capture — sufficient balance ───────────────────────

  describe("handleTargetedCapture — sufficient balance", () => {
    it("debits researchData cost and adds gainedXp, persisting to JSON", async () => {
      // Cost of "common" is 3300 (researchCost.ts); gainedXp = 100 (mocked).
      // Expected final balance: (5000 - 3300) + 100 = 1800
      await seedPlayer(USER_ID, { name: USERNAME, xp: 0, level: 1, researchData: 5000 });

      const interaction = buildInteraction({
        options: { zone: "pastoral-route", rarity: "common" },
      });

      await handleTargetedCapture(interaction, GUILD_ID, "pastoral-route", "common");

      const players = await readPlayers(GUILD_ID);
      const saved = players[USER_ID];

      expect(saved.researchData).toBe(1800);
      expect(saved.xp).toBe(100);
      expect(saved.captureList?.["1"]?.total).toBe(1);
    });

    it("calls checkIfUserCanCatch (cooldown consumed on successful capture)", async () => {
      await seedPlayer(USER_ID, { name: USERNAME, researchData: 5000 });
      const interaction = buildInteraction({ options: { zone: "pastoral-route", rarity: "common" } });

      await handleTargetedCapture(interaction, GUILD_ID, "pastoral-route", "common");

      expect(checkIfUserCanCatch).toHaveBeenCalledOnce();
    });

    it("calls editReply with an embed", async () => {
      await seedPlayer(USER_ID, { name: USERNAME, researchData: 5000 });
      const interaction = buildInteraction({ options: { zone: "pastoral-route", rarity: "common" } });

      await handleTargetedCapture(interaction, GUILD_ID, "pastoral-route", "common");

      expect(interaction.editReply).toHaveBeenCalledOnce();
      const arg = interaction.editReply.mock.calls[0][0];
      expect(arg).toHaveProperty("embeds");
    });
  });

  // ── Flow 2b: targeted capture — insufficient balance ────────────────────

  describe("handleTargetedCapture — insufficient balance", () => {
    it("replies with insuffisantes message and does NOT consume cooldown", async () => {
      // cost = 3300, balance = 1000 → should reject immediately
      await seedPlayer(USER_ID, { name: USERNAME, researchData: 1000 });
      const interaction = buildInteraction({ options: { zone: "pastoral-route", rarity: "common" } });

      await handleTargetedCapture(interaction, GUILD_ID, "pastoral-route", "common");

      const replyArg: string = interaction.editReply.mock.calls[0][0];
      expect(replyArg).toContain("insuffisantes");
      expect(replyArg).toContain("3300"); // cost
      expect(replyArg).toContain("1000"); // current balance

      // Balance check fires BEFORE cooldown — no cooldown should be consumed.
      expect(checkIfUserCanCatch).not.toHaveBeenCalled();
    });

    it("leaves researchData unchanged in JSON", async () => {
      await seedPlayer(USER_ID, { name: USERNAME, researchData: 1000 });
      const interaction = buildInteraction({ options: { zone: "pastoral-route", rarity: "common" } });

      await handleTargetedCapture(interaction, GUILD_ID, "pastoral-route", "common");

      const players = await readPlayers(GUILD_ID);
      expect(players[USER_ID].researchData).toBe(1000);
    });
  });

  // ── Flow 2c: captureCibleCommand guard rails ─────────────────────────────

  describe("captureCibleCommand", () => {
    it("rejects when guildId is missing", async () => {
      const interaction = buildInteraction({
        guildId: null,
        options: { zone: "pastoral-route", rarity: "common" },
      });

      await captureCibleCommand(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        "Cette commande n'est disponible que sur un serveur.",
      );
    });

    it("rejects an invalid rarity before touching the player state", async () => {
      await seedPlayer(USER_ID, { name: USERNAME, researchData: 999999 });
      const interaction = buildInteraction({
        options: { zone: "pastoral-route", rarity: "does_not_exist" },
      });

      await captureCibleCommand(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith("Rareté invalide.");
      // Player's balance must remain untouched.
      const players = await readPlayers(GUILD_ID);
      expect(players[USER_ID].researchData).toBe(999999);
    });
  });

  // ── Flow 3: pity counter ─────────────────────────────────────────────────

  describe("getPity", () => {
    it("returns the current pity counter and threshold in the reply", async () => {
      await seedPlayer(USER_ID, { name: USERNAME, pityCounter: 7 });
      const interaction = buildInteraction();

      await getPity(interaction);

      expect(interaction.editReply).toHaveBeenCalledOnce();
      const reply: string = interaction.editReply.mock.calls[0][0];
      expect(reply).toContain("7/10");
      expect(reply).toContain("Non"); // not yet at threshold
    });

    it("indicates boost is ready when counter equals threshold", async () => {
      await seedPlayer(USER_ID, { name: USERNAME, pityCounter: 10 });
      const interaction = buildInteraction();

      await getPity(interaction);

      const reply: string = interaction.editReply.mock.calls[0][0];
      expect(reply).toContain("10/10");
      expect(reply).toContain("Oui");
    });
  });

  // ── Flow 5: captureCommand orchestration ────────────────────────────────

  describe("captureCommand", () => {
    it("persiste xp et researchData après une capture réussie", async () => {
      await seedPlayer(USER_ID, { name: USERNAME, xp: 0, level: 1, researchData: 0 });
      const interaction = buildInteraction();

      await captureCommand(interaction);

      const players = await readPlayers(GUILD_ID);
      const saved = players[USER_ID];
      expect(saved.xp).toBe(100);
      expect(saved.researchData).toBe(100);
      expect(saved.captureList?.["1"]?.total).toBe(1);
      expect(interaction.editReply).toHaveBeenCalledOnce();
    });

    it("sort sans toucher le JSON si resolveCaptureLocation retourne null", async () => {
      await seedPlayer(USER_ID, { name: USERNAME, xp: 50, researchData: 50 });
      vi.mocked(resolveCaptureLocation).mockResolvedValueOnce(null);
      const interaction = buildInteraction();

      await captureCommand(interaction);

      expect(checkIfUserCanCatch).not.toHaveBeenCalled();
      const players = await readPlayers(GUILD_ID);
      expect(players[USER_ID].xp).toBe(50);
    });

    it("sort sans toucher le JSON si le cooldown n'est pas expiré", async () => {
      await seedPlayer(USER_ID, { name: USERNAME, xp: 50, researchData: 50 });
      vi.mocked(checkIfUserCanCatch).mockResolvedValueOnce(false);
      const interaction = buildInteraction();

      await captureCommand(interaction);

      expect(tryCatchPokemon).not.toHaveBeenCalled();
      const players = await readPlayers(GUILD_ID);
      expect(players[USER_ID].xp).toBe(50);
    });

    it("répond avec un message texte et n'écrit pas d'xp quand aucun pokémon n'est trouvé", async () => {
      await seedPlayer(USER_ID, { name: USERNAME, xp: 0, level: 1, researchData: 0 });
      vi.mocked(tryCatchPokemon).mockResolvedValueOnce({ pokemonCatched: null, rarity: "common" });
      const interaction = buildInteraction();

      await captureCommand(interaction);

      expect(interaction.editReply).toHaveBeenCalledOnce();
      const reply: string = interaction.editReply.mock.calls[0][0];
      expect(typeof reply).toBe("string");
      const players = await readPlayers(GUILD_ID);
      expect(players[USER_ID].xp).toBe(0);
    });

    it("rejette quand guildId est absent", async () => {
      const interaction = buildInteraction({ guildId: null });

      await captureCommand(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        "Cette commande n'est disponible que sur un serveur.",
      );
    });
  });

  // ── Flow 4: pokédex ──────────────────────────────────────────────────────

  describe("pokedexCommand", () => {
    it("shows an empty-capture message when the player has no pokémon", async () => {
      await seedPlayer(USER_ID, { name: USERNAME, captureList: {} });
      const interaction = buildInteraction();

      await pokedexCommand(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        "Tu n'as encore capturé aucun Pokémon.",
      );
    });

    it("renders an embed when the player has at least one capture", async () => {
      await seedPlayer(USER_ID, {
        name: USERNAME,
        captureList: {
          "1": { total: 2, shiny: 0, capturedInCurrentSeason: true },
        },
      });
      const interaction = buildInteraction();

      await pokedexCommand(interaction);

      // editReply receives { embeds: [...] } for the single-page case.
      expect(interaction.editReply).toHaveBeenCalledOnce();
      const arg = interaction.editReply.mock.calls[0][0];
      expect(arg).toHaveProperty("embeds");
      expect(Array.isArray(arg.embeds)).toBe(true);
      expect(arg.embeds.length).toBeGreaterThan(0);
    });

    it("rejects when guildId is missing", async () => {
      const interaction = buildInteraction({ guildId: null });

      await pokedexCommand(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        "Cette commande n'est disponible que sur un serveur.",
      );
    });
  });
});
