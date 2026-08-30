import { describe, it, expect, beforeEach, vi } from "vitest";

const catalog = [
  { id: 1, name: "Bulbizarre", rarity: "epic", generation: 1, zones: ["volcano", "forest"] },
  { id: 2, name: "Herbizarre", rarity: "epic", generation: 1, zones: ["forest"] },
  { id: 3, name: "Salamèche", rarity: "rare", generation: 1, zones: ["volcano"] },
  { id: 4, name: "Reptincel", rarity: "rare", generation: 1, zones: ["volcano"] },
  { id: 5, name: "Deoxys", rarity: "legendary", generation: 3, zones: [] },
  { id: 6, name: "MissingNo", rarity: "unknown", generation: 1 },
];

vi.mock("../../src/utils/pokemonCatalog", () => ({
  getPokemonCatalog: vi.fn(() => catalog),
}));

import { computeZoneCompletion } from "../../src/methods/zones/computeZoneCompletion";
import {
  getZonePokemonIds,
  getZonePokemonIndex,
  clearZonePokemonIndexCache,
} from "../../src/methods/zones/getZonePokemonIndex";

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

describe("getZonePokemonIndex", () => {
  beforeEach(() => clearZonePokemonIndexCache());

  it("groupe les Pokémon par zone", () => {
    expect([...getZonePokemonIds(GUILD_ID, "volcano")]).toEqual([1, 3, 4]);
    expect([...getZonePokemonIds(GUILD_ID, "forest")]).toEqual([1, 2]);
  });

  it("ignore les Pokémon sans zone (Deoxys, roster custom)", () => {
    const allIndexed = new Set(
      [...getZonePokemonIndex(GUILD_ID).values()].flatMap((ids) => [...ids]),
    );
    expect(allIndexed.has(5)).toBe(false);
    expect(allIndexed.has(6)).toBe(false);
  });

  it("renvoie un ensemble vide pour une zone inconnue", () => {
    expect(getZonePokemonIds(GUILD_ID, "nowhere").size).toBe(0);
  });
});

describe("computeZoneCompletion", () => {
  beforeEach(() => clearZonePokemonIndexCache());

  it("calcule le ratio local à la zone", () => {
    const completion = computeZoneCompletion(
      GUILD_ID,
      player({ "1": { total: 2, shiny: 0 }, "3": { total: 1, shiny: 1 } }),
      "volcano",
    );

    expect(completion).toMatchObject({
      zoneId: "volcano",
      total: 3,
      captured: 2,
      shiny: 1,
      missing: 1,
      percentage: 66.7,
    });
  });

  it("ne compte un Pokémon qu'une fois, quel que soit le nombre de captures", () => {
    const completion = computeZoneCompletion(
      GUILD_ID,
      player({ "1": { total: 12, shiny: 3 } }),
      "forest",
    );
    expect(completion.captured).toBe(1);
    expect(completion.percentage).toBe(50);
  });

  it("compte le même Pokémon dans chacune de ses zones (les % ne s'additionnent pas)", () => {
    const p = player({ "1": { total: 1, shiny: 0 } });
    expect(computeZoneCompletion(GUILD_ID, p, "volcano").captured).toBe(1);
    expect(computeZoneCompletion(GUILD_ID, p, "forest").captured).toBe(1);
  });

  it("renvoie 100 % quand toute la zone est capturée", () => {
    const completion = computeZoneCompletion(
      GUILD_ID,
      player({
        "1": { total: 1, shiny: 0 },
        "3": { total: 1, shiny: 0 },
        "4": { total: 1, shiny: 0 },
      }),
      "volcano",
    );
    expect(completion.percentage).toBe(100);
    expect(completion.missing).toBe(0);
  });

  it("renvoie 0 % pour un joueur sans capture ou inexistant", () => {
    expect(computeZoneCompletion(GUILD_ID, null, "volcano").percentage).toBe(0);
    expect(computeZoneCompletion(GUILD_ID, player({}), "volcano").percentage).toBe(0);
  });

  it("ignore une entrée de captureList à 0 capture", () => {
    const completion = computeZoneCompletion(
      GUILD_ID,
      player({ "1": { total: 0, shiny: 0 } }),
      "forest",
    );
    expect(completion.captured).toBe(0);
  });

  it("ignore les captures des saisons précédentes", () => {
    const completion = computeZoneCompletion(
      GUILD_ID,
      player({
        "1": { total: 3, shiny: 1, capturedInCurrentSeason: false },
        "3": { total: 1, shiny: 0 },
      }),
      "volcano",
    );

    expect(completion).toMatchObject({
      total: 3,
      captured: 1,
      shiny: 0,
      missing: 2,
      percentage: 33.3,
    });
  });

  it("ne divise pas par zéro sur une zone vide", () => {
    const completion = computeZoneCompletion(GUILD_ID, player({}), "nowhere");
    expect(completion).toMatchObject({ total: 0, captured: 0, percentage: 0 });
  });
});
