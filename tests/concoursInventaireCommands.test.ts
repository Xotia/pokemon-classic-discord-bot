import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pokemon-classic-concours-"));
const guildDir = (guildId: string) => path.join(tmpRoot, guildId);
const playersDb = (guildId: string) => path.join(guildDir(guildId), "players.json");

vi.mock("../src/config/paths", () => ({
  playersDb: (guildId: string) => playersDb(guildId),
  guildDir: (guildId: string) => guildDir(guildId),
}));

import { concoursCommand } from "../src/commands/concoursCommand";
import { inventaireCommand } from "../src/commands/inventaireCommand";

const GUILD = "concours-guild";

function seed(players: Record<string, unknown>): void {
  fs.mkdirSync(guildDir(GUILD), { recursive: true });
  fs.writeFileSync(playersDb(GUILD), JSON.stringify(players), "utf8");
}

function makeInteraction(userId = "u1") {
  return {
    guildId: GUILD,
    user: { id: userId, username: "Ash" },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

function base(name: string, extra: Record<string, unknown> = {}) {
  return { name, xp: 0, level: 1, pityCounter: 0, researchData: 0, ...extra };
}

const progress = (captures: Record<string, number>, pumpkins = 0) => ({
  halloween2026: { captures, pumpkins },
});

beforeEach(() => {
  delete process.env.HALLOWEEN_EVENT_DEBUG;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  fs.rmSync(guildDir(GUILD), { recursive: true, force: true });
});

function embedOf(interaction: ReturnType<typeof makeInteraction>): any {
  return interaction.editReply.mock.calls[0][0].embeds[0].toJSON();
}

describe("/concours", () => {
  it("avant l'évènement : message d'attente", async () => {
    vi.setSystemTime(new Date("2026-10-30T12:00:00Z"));
    const i = makeInteraction();
    await concoursCommand(i);
    expect(i.editReply).toHaveBeenCalledWith(expect.stringContaining("31 octobre à minuit"));
  });

  it("pendant : score détaillé, rang ex aequo et top", async () => {
    vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
    seed({
      u1: base("Ash", { events: progress({ rare: 2 }, 1) }),
      u2: base("Misty", { events: progress({ common: 9 }) }),
      u3: base("Brock", { events: progress({ common: 1 }) }),
    });
    const i = makeInteraction("u1");
    await concoursCommand(i);
    const embed = embedOf(i);
    const mine = embed.fields[0].value as string;
    expect(mine).toContain("9 points");
    expect(mine).toContain("1er ex aequo");
    expect(mine).toContain("Rare : 2 × 3 pt");
    expect(mine).toContain("Citrouilles : 1 × 3 pt");
    expect(embed.fields[1].value).toContain("Misty");
    expect(embed.title).not.toContain("final");
  });

  it("après : classement final", async () => {
    vi.setSystemTime(new Date("2026-11-02T12:00:00Z"));
    seed({ u1: base("Ash", { events: progress({ rare: 1 }) }) });
    const i = makeInteraction("u1");
    await concoursCommand(i);
    expect(embedOf(i).title).toContain("final");
  });

  it("joueur sans point : message dédié", async () => {
    vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
    seed({ u1: base("Ash") });
    const i = makeInteraction("u1");
    await concoursCommand(i);
    expect(embedOf(i).fields[0].value).toContain("Aucun point");
  });
});

describe("/inventaire", () => {
  it("inventaire vide : message sympathique", async () => {
    seed({ u1: base("Ash") });
    const i = makeInteraction("u1");
    await inventaireCommand(i);
    expect(i.editReply).toHaveBeenCalledWith(expect.stringContaining("vide"));
  });

  it("inventaire garni : liste les objets", async () => {
    seed({ u1: base("Ash", { items: { pumpkin: 3 } }) });
    const i = makeInteraction("u1");
    await inventaireCommand(i);
    const embed = embedOf(i);
    expect(embed.description).toContain("🎃");
    expect(embed.description).toContain("Citrouille");
    expect(embed.description).toContain("× 3");
  });
});
