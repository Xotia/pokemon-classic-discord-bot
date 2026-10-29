import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { Player } from "../src/types/Player";

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pokemon-classic-halloween-contest-"));
const guildDir = (guildId: string) => path.join(tmpRoot, guildId);
const playersDb = (guildId: string) => path.join(guildDir(guildId), "players.json");

vi.mock("../src/config/paths", () => ({
  playersDb: (guildId: string) => playersDb(guildId),
  guildDir: (guildId: string) => guildDir(guildId),
}));

vi.mock("../src/utils/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  getLoggerForGuild: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

vi.mock("../src/methods/pokemon/isThePokemonGonnaBeShiny", () => ({
  isThePokemonGonnaBeShiny: () => false,
}));
vi.mock("../src/methods/pokemon/getCapturedPokemonHp", () => ({
  getCapturedPokemonHp: () => 50,
}));
const buildEmbed = vi.hoisted(() => vi.fn());
vi.mock("../src/methods/embed/buildCapturedPokemonEmbed", () => ({
  buildCapturedPokemonEmbed: (params: unknown) => {
    buildEmbed(params);
    return { embed: {}, footer: "footer", isInPokedex: true };
  },
}));
vi.mock("../src/methods/console-logs/displayLogs", () => ({ displayLogs: () => {} }));
vi.mock("../src/methods/stats/addAllStats", () => ({ addAllStats: async () => {} }));

import {
  buildContestEndResults,
  computeContestScore,
  formatRank,
  getContestPhase,
  getContestWinners,
  rankContest,
  rollPumpkin,
} from "../src/features/halloweenEvent/halloweenContest.service";
import { handleSuccessfulCapture } from "../src/methods/pokemon/handleSuccessfulCapture";

const GUILD = "contest-guild";
const DURING = new Date("2026-10-31T12:00:00Z");
const BEFORE = new Date("2026-10-30T12:00:00Z");
const AFTER = new Date("2026-11-01T12:00:00Z");

function makePlayer(name: string, captures: Record<string, number> = {}, pumpkins = 0): Player {
  return {
    name,
    xp: 0,
    level: 1,
    pityCounter: 0,
    researchData: 0,
    events: { halloween2026: { captures, pumpkins } },
  };
}

function seed(players: Record<string, Player>): void {
  fs.mkdirSync(guildDir(GUILD), { recursive: true });
  fs.writeFileSync(playersDb(GUILD), JSON.stringify(players, null, 2), "utf8");
}

function persisted(userId: string): Player {
  return JSON.parse(fs.readFileSync(playersDb(GUILD), "utf8"))[userId];
}

beforeEach(() => {
  delete process.env.HALLOWEEN_EVENT_DEBUG;
  buildEmbed.mockReset();
});

afterEach(() => {
  fs.rmSync(guildDir(GUILD), { recursive: true, force: true });
});

describe("score du concours", () => {
  it("applique le barème par rareté et 3 points par citrouille", () => {
    const score = computeContestScore({
      captures: {
        common: 1,
        uncommon: 1,
        rare: 1,
        very_rare: 1,
        epic: 1,
        ultra_rare: 1,
        mythic: 1,
        legendary: 1,
        legendary_wandering: 1,
      },
      pumpkins: 2,
    });
    // 1+2+3+5+8+12+20+30+30 = 111, plus 2 × 3
    expect(score).toBe(117);
  });

  it("compte une rareté inconnue pour 1 point", () => {
    expect(computeContestScore({ captures: { unknown: 2 }, pumpkins: 0 })).toBe(2);
  });

  it("une progression vide vaut 0", () => {
    expect(computeContestScore({ captures: {}, pumpkins: 0 })).toBe(0);
  });
});

describe("classement et gagnants", () => {
  it("égalité au sommet : plusieurs gagnants, rang partagé", () => {
    const players = {
      a: makePlayer("A", { rare: 2 }),
      b: makePlayer("B", { common: 6 }),
      c: makePlayer("C", { common: 2 }),
    };
    const winners = getContestWinners(players);
    expect(winners.map((w) => w.userId).sort()).toEqual(["a", "b"]);
    const ranking = rankContest(players);
    expect(formatRank(ranking[0])).toBe("1er ex aequo");
    expect(ranking[2].rank).toBe(3);
    expect(formatRank(ranking[2])).toBe("3e");
  });

  it("score maximum à 0 : aucun gagnant", () => {
    const players = { a: makePlayer("A"), b: makePlayer("B") };
    expect(getContestWinners(players)).toEqual([]);
  });

  it("ignore les joueurs sans suivi du concours", () => {
    const players = { a: { name: "A", xp: 0, level: 1, pityCounter: 0, researchData: 0 } as Player };
    expect(rankContest(players)).toEqual([]);
  });

  it("l'embed de fin mentionne les gagnants et la remise par un admin", () => {
    const results = buildContestEndResults({
      a: makePlayer("A", { rare: 2 }),
      b: makePlayer("B", { common: 6 }),
      c: makePlayer("C", { common: 2 }),
    });
    expect(results.value).toContain("<@a>");
    expect(results.value).toContain("<@b>");
    expect(results.value).toContain("6 points");
    expect(results.value).toContain("<@c>");
    expect(results.value).toContain("admin");
  });

  it("l'embed de fin sans participant", () => {
    expect(buildContestEndResults({}).value).toBe("Personne n'a osé entrer dans le Manoir…");
  });
});

describe("phase du concours", () => {
  it("avant, pendant, après", () => {
    expect(getContestPhase(BEFORE)).toBe("before");
    expect(getContestPhase(DURING)).toBe("during");
    expect(getContestPhase(AFTER)).toBe("after");
  });
});

describe("tirage de citrouille", () => {
  it("0.14 donne une citrouille, 0.15 non", () => {
    expect(rollPumpkin(() => 0.14)).toBe(true);
    expect(rollPumpkin(() => 0.15)).toBe(false);
  });
});

describe("handleSuccessfulCapture et concours", () => {
  const pokemon = { id: 1, name: "Ectoplasma", rarity: "rare" };
  const interaction = () => ({
    user: { id: "u1" },
    editReply: vi.fn().mockResolvedValue(undefined),
  });

  async function capture(zone: string, random: number, now: Date) {
    seed({ u1: { name: "Ash", xp: 0, level: 1, pityCounter: 0, researchData: 0 } });
    const player = persisted("u1");
    await handleSuccessfulCapture(
      interaction(),
      GUILD,
      player,
      pokemon,
      "rare",
      zone,
      undefined,
      () => random,
      now,
    );
    return persisted("u1");
  }

  it("dans le Manoir pendant la fenêtre : capture comptée et citrouille", async () => {
    const saved = await capture("haunted-manor", 0.14, DURING);
    expect(saved.events?.halloween2026).toEqual({ captures: { rare: 1 }, pumpkins: 1 });
    expect(saved.items).toEqual({ pumpkin: 1 });
    expect(buildEmbed.mock.calls[0][0].pumpkinFound).toBe(true);
  });

  it("dans le Manoir sans citrouille : capture comptée seulement", async () => {
    const saved = await capture("haunted-manor", 0.15, DURING);
    expect(saved.events?.halloween2026).toEqual({ captures: { rare: 1 }, pumpkins: 0 });
    expect(saved.items).toBeUndefined();
    expect(buildEmbed.mock.calls[0][0].pumpkinFound).toBe(false);
  });

  it("hors du Manoir : rien n'est compté, pas de tirage", async () => {
    const random = vi.fn(() => 0);
    seed({ u1: { name: "Ash", xp: 0, level: 1, pityCounter: 0, researchData: 0 } });
    await handleSuccessfulCapture(
      interaction(), GUILD, persisted("u1"), pokemon, "rare", "verdant-plain", undefined, random, DURING,
    );
    expect(random).not.toHaveBeenCalled();
    expect(persisted("u1").events).toBeUndefined();
    expect(persisted("u1").items).toBeUndefined();
  });

  it("hors fenêtre : rien n'est compté dans le Manoir", async () => {
    for (const when of [BEFORE, AFTER]) {
      const saved = await capture("haunted-manor", 0, when);
      expect(saved.events).toBeUndefined();
      expect(saved.items).toBeUndefined();
    }
  });

  it("les compteurs s'additionnent sur des captures successives", async () => {
    seed({ u1: { name: "Ash", xp: 0, level: 1, pityCounter: 0, researchData: 0 } });
    const rolls = [0.01, 0.9, 0.05];
    for (const r of rolls) {
      await handleSuccessfulCapture(
        interaction(), GUILD, persisted("u1"), pokemon, "rare", "haunted-manor", undefined, () => r, DURING,
      );
    }
    const saved = persisted("u1");
    expect(saved.events?.halloween2026).toEqual({ captures: { rare: 3 }, pumpkins: 2 });
    expect(saved.items?.pumpkin).toBe(2);
  });

  it("la capture ciblée n'utilise pas ce chemin", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../src/methods/research/handleTargetedCapture.ts"),
      "utf-8",
    );
    expect(source).not.toContain("recordContestCapture");
    expect(source).not.toContain("handleSuccessfulCapture");
  });
});
