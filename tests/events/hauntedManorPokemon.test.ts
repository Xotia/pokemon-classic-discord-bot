import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/utils/logger", () => {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  return { default: log, getLoggerForGuild: () => log };
});

import { RARITY_ORDER } from "../../src/config/rarity";
import { HALLOWEEN_ZONE_ID } from "../../src/features/halloweenEvent/halloweenEventConfig";
import { getPokemonCatalog } from "../../src/utils/pokemonCatalog";
import { getRandomPokemonFromRarity } from "../../src/methods/pokemon/getRandomPokemonFromRarity";
import { getTotalPokemonNumber } from "../../src/methods/pokedex/getTotalPokemonNumber";
import { getZonePokemonIds } from "../../src/methods/zones/getZonePokemonIndex";
import zonesAll from "../../data/zones_all.json";

// Serveur sans othermons.json : le catalogue ne contient que les fichiers partagés.
const GUILD = "haunted-manor-test";
const EVENT_ONLY_IDS = [
  442, 407, 429, 430, 477, 478, 479, 491, 607, 608, 609, 710, 711, 778, 854, 855,
  4106, 4107, 4108, 4109, 4110, // formes de Motisma (ids custom)
];

const catalog = () => getPokemonCatalog(GUILD);
const gen4Plus = () => catalog().filter((p) => p.generation >= 4);

afterEach(() => vi.restoreAllMocks());

describe("Pokémon du Manoir hanté", () => {
  it("la zone contient les 29 Pokémon gen1-3 et les 21 Pokémon gen4+ (formes comprises)", () => {
    const ids = getZonePokemonIds(GUILD, HALLOWEEN_ZONE_ID);
    const byGen = (gen: number) => [...ids].filter((id) => catalog().find((p) => p.id === id)!.generation === gen);

    expect(ids.size).toBe(50);
    expect(byGen(1)).toHaveLength(12);
    expect(byGen(2)).toHaveLength(11);
    expect(byGen(3)).toHaveLength(6);
    expect([...ids].filter((id) => EVENT_ONLY_IDS.includes(id))).toHaveLength(21);
  });

  it("les gen4+ du catalogue sont exactement les 21 Pokémon de l'évènement, uniquement dans le manoir", () => {
    expect(gen4Plus().map((p) => p.id).sort((a, b) => a - b)).toEqual([...EVENT_ONLY_IDS].sort((a, b) => a - b));
    for (const pokemon of gen4Plus()) {
      expect(pokemon.zones).toEqual([HALLOWEEN_ZONE_ID]);
      expect(RARITY_ORDER).toContain(pokemon.rarity);
    }
  });

  it("chaque rareté du manoir est représentée sauf les tiers hauts réservés", () => {
    const rarities = new Set(
      catalog().filter((p) => p.zones?.includes(HALLOWEEN_ZONE_ID)).map((p) => p.rarity),
    );
    for (const rarity of ["common", "uncommon", "rare", "very_rare", "epic", "ultra_rare"]) {
      expect(rarities).toContain(rarity);
    }
  });

  it("le manoir n'appartient à aucune génération de zones_all.json", () => {
    for (const [key, zones] of Object.entries(zonesAll as Record<string, { id: string }[]>)) {
      if (/^gen\d+$/.test(key)) expect(zones.map((z) => z.id)).not.toContain(HALLOWEEN_ZONE_ID);
    }
  });
});

describe("fuite des gen4+ hors du manoir", () => {
  const normalZones = (gen: "gen1" | "gen2" | "gen3") =>
    (zonesAll as Record<string, { id: string }[]>)[gen].map((z) => z.id);

  it.each(["gen1", "gen2", "gen3"] as const)(
    "aucune capture aléatoire dans une zone %s ne donne une génération >= 4",
    (gen) => {
      for (const zoneId of normalZones(gen)) {
        for (const rarity of RARITY_ORDER) {
          for (let i = 0; i < 20; i++) {
            const pokemon = getRandomPokemonFromRarity(GUILD, rarity, gen, zoneId);
            if (pokemon) expect(pokemon.generation).toBeLessThan(4);
          }
        }
      }
    },
  );

  it("le jeton multi-gen avec une zone normale ne donne aucun gen4+", () => {
    for (const zoneId of normalZones("gen3")) {
      for (const rarity of RARITY_ORDER) {
        const pokemon = getRandomPokemonFromRarity(GUILD, rarity, "multi-gen", zoneId);
        if (pokemon) expect(pokemon.generation).toBeLessThan(4);
      }
    }
  });

  it("le manoir peut donner un gen4+ via le jeton multi-gen", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) {
      for (const rarity of RARITY_ORDER) {
        const pokemon = getRandomPokemonFromRarity(GUILD, rarity, "multi-gen", HALLOWEEN_ZONE_ID);
        if (pokemon) seen.add(pokemon.id);
      }
    }
    for (const id of EVENT_ONLY_IDS) expect(seen).toContain(id);
  });

  it("aucun gen4+ n'est tirable par une génération numérique 1 à 3", () => {
    for (const gen of ["gen1", "gen2", "gen3"]) {
      for (const rarity of RARITY_ORDER) {
        const pokemon = getRandomPokemonFromRarity(GUILD, rarity, gen);
        if (pokemon) expect(pokemon.generation).toBeLessThan(4);
      }
    }
  });
});

describe("total du Pokédex (D3)", () => {
  it("le total est la taille du catalogue, gen4+ inclus, sans filtre", () => {
    const total = getTotalPokemonNumber(GUILD);
    expect(total).toBe(catalog().length);
    expect(total - catalog().filter((p) => p.generation <= 3).length).toBe(21);
  });
});
