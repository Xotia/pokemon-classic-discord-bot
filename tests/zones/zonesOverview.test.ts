import { describe, it, expect, beforeEach, vi } from "vitest";

const catalog = [
  { id: 1, name: "Bulbizarre", rarity: "epic", generation: 1, zones: ["volcano", "forest"] },
  { id: 2, name: "Herbizarre", rarity: "epic", generation: 1, zones: ["forest"] },
  { id: 3, name: "Salamèche", rarity: "rare", generation: 1, zones: ["volcano"] },
  { id: 4, name: "Reptincel", rarity: "rare", generation: 1, zones: ["volcano"] },
  { id: 7, name: "Noctali", rarity: "rare", generation: 2, zones: ["night-road"] },
  { id: 8, name: "Séléroc", rarity: "legendary", generation: 3, zones: ["meteorite-crater"] },
];

const unlockedZones: Record<string, { id: string; label: string }[]> = {
  gen2: [
    { id: "night-road", label: "Route nocturne" },
    { id: "ghost-town", label: "Ville fantôme" },
  ],
  gen1: [
    { id: "volcano", label: "Volcan" },
    { id: "forest", label: "Forêt" },
  ],
};

const isMeteoriteEventActive = vi.fn(() => false);

vi.mock("../../src/utils/pokemonCatalog", () => ({
  getPokemonCatalog: vi.fn(() => catalog),
}));

vi.mock("../../src/utils/loadUnlockedZones", () => ({
  loadUnlockedZones: vi.fn(() => unlockedZones),
}));

vi.mock("../../src/features/meteoriteEvent/meteoriteEventConfig", () => ({
  METEORITE_ZONE_ID: "meteorite-crater",
  METEORITE_ZONE_LABEL: "Cratère de la Météorite",
  isMeteoriteEventActive: () => isMeteoriteEventActive(),
}));

import { computeAllZonesCompletion } from "../../src/methods/zones/computeAllZonesCompletion";
import { buildZonesOverviewEmbed } from "../../src/methods/embed/buildZonesOverviewEmbed";
import { clearZonePokemonIndexCache } from "../../src/methods/zones/getZonePokemonIndex";

const GUILD_ID = "test-guild";

const player = (
  captureList: Record<
    string,
    { total: number; shiny: number; capturedInCurrentSeason?: boolean }
  >,
) =>
  ({
    name: "Kevin",
    captureList: Object.fromEntries(
      Object.entries(captureList).map(([id, stats]) => [
        id,
        { capturedInCurrentSeason: true, ...stats },
      ]),
    ),
    pityCounter: 0,
    xp: 0,
    level: 1,
    researchData: 0,
  }) as any;

describe("computeAllZonesCompletion", () => {
  beforeEach(() => {
    clearZonePokemonIndexCache();
    isMeteoriteEventActive.mockReturnValue(false);
  });

  it("groupe les zones débloquées par génération, dans l'ordre des générations", () => {
    const groups = computeAllZonesCompletion(GUILD_ID, player({}));
    expect(groups.map((g) => g.generation)).toEqual(["gen1", "gen2"]);
    expect(groups[0].zones.map((z) => z.zone.id)).toEqual(["volcano", "forest"]);
  });

  it("écarte une zone débloquée mais vide de Pokémon", () => {
    const groups = computeAllZonesCompletion(GUILD_ID, player({}));
    const gen2 = groups.find((g) => g.generation === "gen2")!;
    expect(gen2.zones.map((z) => z.zone.id)).toEqual(["night-road"]);
  });

  it("calcule le ratio de chaque zone sur la saison en cours", () => {
    const groups = computeAllZonesCompletion(
      GUILD_ID,
      player({
        "1": { total: 1, shiny: 0 },
        "3": { total: 1, shiny: 0, capturedInCurrentSeason: false },
      }),
    );
    const gen1 = groups.find((g) => g.generation === "gen1")!;
    expect(gen1.zones.map((z) => z.completion.percentage)).toEqual([33.3, 50]);
  });

  it("n'ajoute la zone d'événement que pendant l'événement", () => {
    expect(
      computeAllZonesCompletion(GUILD_ID, player({})).some(
        (g) => g.generation === "event",
      ),
    ).toBe(false);

    isMeteoriteEventActive.mockReturnValue(true);
    const groups = computeAllZonesCompletion(GUILD_ID, player({}));
    const event = groups.find((g) => g.generation === "event")!;
    expect(event.zones[0].zone.label).toBe("Cratère de la Météorite");
    expect(event.zones[0].completion.total).toBe(1);
  });
});

describe("buildZonesOverviewEmbed", () => {
  beforeEach(() => {
    clearZonePokemonIndexCache();
    isMeteoriteEventActive.mockReturnValue(false);
  });

  it("liste chaque zone avec son ratio, sous le nom de sa région", () => {
    const groups = computeAllZonesCompletion(
      GUILD_ID,
      player({ "1": { total: 1, shiny: 0 }, "2": { total: 1, shiny: 0 } }),
    );
    const description = buildZonesOverviewEmbed("Kevin", groups).data.description!;

    expect(description).toContain("Kanto");
    expect(description).toContain("Johto");
    expect(description).toContain("Volcan (1/3)");
    expect(description).toContain("Forêt (2/2)");
    expect(description).toContain("Route nocturne (0/1)");
  });

  it("compte les zones terminées et la moyenne, sans total agrégé de Pokémon", () => {
    const groups = computeAllZonesCompletion(
      GUILD_ID,
      player({ "1": { total: 1, shiny: 0 }, "2": { total: 1, shiny: 0 } }),
    );
    const description = buildZonesOverviewEmbed("Kevin", groups).data.description!;

    expect(description).toContain("**Zones terminées :** 1 / 3");
    expect(description).toContain("**Moyenne des zones :** 44.4 %");
  });

  it("distingue visuellement une zone entamée d'une zone vide, et 100 % du reste", () => {
    const groups = computeAllZonesCompletion(
      GUILD_ID,
      player({ "1": { total: 1, shiny: 0 }, "2": { total: 1, shiny: 0 } }),
    );
    const description = buildZonesOverviewEmbed("Kevin", groups).data.description!;
    const barOf = (label: string) =>
      description.split("\n").find((line) => line.includes(label))!.split("`")[1];

    expect(barOf("Route nocturne")).toBe("░".repeat(10));
    expect(barOf("Volcan")).toContain("█");
    expect(barOf("Forêt")).toBe("█".repeat(10));
  });

  it("rappelle que les pourcentages ne s'additionnent pas", () => {
    const groups = computeAllZonesCompletion(GUILD_ID, player({}));
    const embed = buildZonesOverviewEmbed("Kevin", groups);
    expect(embed.data.footer?.text).toContain("ne s'additionnent pas");
    expect(embed.data.footer?.text).toContain("saison en cours");
  });

  it("tient dans la limite de description d'un embed Discord", () => {
    const groups = computeAllZonesCompletion(GUILD_ID, player({}));
    expect(
      buildZonesOverviewEmbed("Kevin", groups).data.description!.length,
    ).toBeLessThan(4096);
  });
});
