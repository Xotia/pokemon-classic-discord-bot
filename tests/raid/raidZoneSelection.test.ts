import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Les zones de test : gen1 a encore une zone à débloquer, gen2 est épuisée
 * (c'est l'état de Johto en production), gen3 n'a rien de débloqué.
 */
const zonesUnlocked: Record<string, { id: string; label: string }[]> = {
  gen1: [{ id: "gen1-a", label: "Zone 1A" }],
  gen2: [{ id: "gen2-a", label: "Zone 2A" }],
  gen3: [],
};

const zonesToUnlock: Record<string, { id: string; label: string }[]> = {
  gen1: [{ id: "gen1-b", label: "Zone 1B" }],
  gen2: [],
  gen3: [{ id: "gen3-a", label: "Zone 3A" }],
};

let maxGeneration = 2;
let nextZoneChance = 100;

vi.mock("node:fs/promises", () => ({
  readFile: async (filePath: string) =>
    JSON.stringify(filePath.includes("to_unlock") ? zonesToUnlock : zonesUnlocked),
}));

vi.mock("../../src/config/paths", () => ({
  zonesUnlockedDb: () => "/fake/zones_unlocked.json",
  zonesToUnlockDb: () => "/fake/zones_to_unlock.json",
}));

vi.mock("../../src/config/guildSettings", () => ({
  getRaidNextZoneChance: () => nextZoneChance,
  getRaidStartHour: () => "0 18 * * *",
  getRaidEndHour: () => "0 20 * * *",
  getGenerationNumber: () => maxGeneration,
}));

vi.mock("../../src/utils/logger", () => ({
  getLoggerForGuild: () => ({ info: () => undefined, error: () => undefined, warn: () => undefined }),
}));

vi.mock("../../src/utils/pokemonCatalog", () => ({
  getPokemonCatalog: () =>
    ["gen1-a", "gen1-b", "gen2-a", "gen3-a"].map((zoneId, index) => ({
      id: index + 1,
      name: `Mon-${zoneId}`,
      rarity: "common",
      types: ["normal"],
      effectiveness: { defense: { normal: 1 }, attack: { normal: 1 } },
      stats: { hp: 10, attack: 10, defense: 10, specialAttack: 10, specialDefense: 10, speed: 10 },
      zones: [zoneId],
    })),
}));

import { generateRaidState } from "../../src/features/raid/raidGenerator.service";

describe("sélection de la génération et de la zone d'un raid", () => {
  beforeEach(() => {
    maxGeneration = 2;
    nextZoneChance = 100;
  });

  it("n'attribue jamais un raid « nouvelle zone » à une génération épuisée", async () => {
    // 100% de chance de nouvelle zone : gen2 n'ayant plus rien à débloquer,
    // tous les tirages doivent sortir sur gen1.
    for (let i = 0; i < 30; i++) {
      const state = await generateRaidState("guild");
      expect(state.generation).toBe(1);
      expect(state.zone).toBe("Zone 1B");
    }
  });

  it("retombe sur une zone déjà débloquée quand plus aucune génération n'a de nouvelle zone", async () => {
    const savedGen1 = zonesToUnlock.gen1;
    zonesToUnlock.gen1 = [];

    try {
      const state = await generateRaidState("guild");
      expect(["Zone 1A", "Zone 2A"]).toContain(state.zone);
    } finally {
      zonesToUnlock.gen1 = savedGen1;
    }
  });

  it("tire toujours sur les zones débloquées quand le tirage « nouvelle zone » échoue", async () => {
    nextZoneChance = 0;

    const zones = new Set<string | null>();
    for (let i = 0; i < 40; i++) {
      zones.add((await generateRaidState("guild")).zone);
    }

    expect(zones.has("Zone 1B")).toBe(false);
    expect([...zones].every((zone) => zone === "Zone 1A" || zone === "Zone 2A")).toBe(true);
  });

  it("honore une demande explicite de génération et de nouvelle zone", async () => {
    const state = await generateRaidState("guild", { generation: 1, newZone: true });

    expect(state.generation).toBe(1);
    expect(state.zone).toBe("Zone 1B");
  });

  it("honore une demande explicite de zone déjà débloquée", async () => {
    const state = await generateRaidState("guild", { generation: 2, newZone: false });

    expect(state.generation).toBe(2);
    expect(state.zone).toBe("Zone 2A");
  });

  it("échoue avec un message clair si l'admin demande une nouvelle zone sur une génération épuisée", async () => {
    await expect(generateRaidState("guild", { generation: 2, newZone: true })).rejects.toThrow(
      /Aucune nouvelle zone à débloquer pour gen2/,
    );
  });

  it("ouvre la première zone d'une génération sans zone débloquée", async () => {
    maxGeneration = 3;
    nextZoneChance = 0;

    const state = await generateRaidState("guild", { generation: 3 });

    // gen3 n'a aucune zone débloquée : le fallback historique ouvre quand même
    // sa première zone à débloquer plutôt que de planter.
    expect(state.zone).toBe("Zone 3A");
  });

  it("refuse une génération hors du plafond configuré", async () => {
    await expect(generateRaidState("guild", { generation: 3 })).rejects.toThrow(
      /Génération forcée invalide/,
    );
  });
});
