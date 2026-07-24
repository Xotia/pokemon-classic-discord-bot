import { describe, it, expect } from "vitest";
import pokemonGen3 from "../data/pokemon-gen3.json";
import zonesAll from "../data/zones_all.json";
import { RARITY_ORDER } from "../src/config/rarity";
import { Pokemon } from "../src/types/Pokemon";

const START_ID = 252;
const END_ID = 386;
const EXPECTED_COUNT = END_ID - START_ID + 1;

const pokemonList = pokemonGen3 as Pokemon[];
const validZoneIds = new Set((zonesAll.gen3 ?? []).map((z) => z.id));

describe("data/pokemon-gen3.json completeness", () => {
  it(`contains exactly ${EXPECTED_COUNT} Pokémon (ids ${START_ID}-${END_ID})`, () => {
    expect(pokemonList.length).toBe(EXPECTED_COUNT);
  });

  it("has no duplicate ids and no gaps in the id range", () => {
    const ids = pokemonList.map((p) => p.id).sort((a, b) => a - b);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
    expect(ids[0]).toBe(START_ID);
    expect(ids[ids.length - 1]).toBe(END_ID);
    for (let i = 0; i < ids.length; i++) {
      expect(ids[i]).toBe(START_ID + i);
    }
  });

  it("declares at least one gen3 zone in zones_all.json", () => {
    expect(validZoneIds.size).toBeGreaterThan(0);
  });

  describe.each(pokemonList.map((p) => [p.id, p.name, p] as const))(
    "Pokémon %i (%s)",
    (_id, _name, pokemon) => {
      it("has core identity fields filled", () => {
        expect(pokemon.name).toBeTruthy();
        expect((pokemon as any).originalName).toBeTruthy();
        expect(pokemon.generation).toBe(3);
      });

      it("has a valid rarity", () => {
        expect(RARITY_ORDER).toContain(pokemon.rarity);
      });

      it("has non-empty image URLs", () => {
        expect(pokemon.image).toBeTruthy();
        expect(pokemon.shinyImage).toBeTruthy();
      });

      it("has at least one type", () => {
        expect(Array.isArray(pokemon.types)).toBe(true);
        expect(pokemon.types.length).toBeGreaterThan(0);
      });

      it("has all six base stats set to a positive number", () => {
        const stats = pokemon.stats;
        for (const key of [
          "hp",
          "attack",
          "defense",
          "specialAttack",
          "specialDefense",
          "speed",
        ] as const) {
          expect(typeof stats[key]).toBe("number");
          expect(stats[key]).toBeGreaterThan(0);
        }
      });

      it("has defense and attack effectiveness maps", () => {
        expect(typeof pokemon.effectiveness?.defense).toBe("object");
        expect(typeof pokemon.effectiveness?.attack).toBe("object");
      });

      it("has a non-empty zones array made of known gen3 zone ids", () => {
        expect(Array.isArray(pokemon.zones)).toBe(true);
        expect((pokemon.zones ?? []).length).toBeGreaterThan(0);
        for (const zoneId of pokemon.zones ?? []) {
          expect(validZoneIds.has(zoneId)).toBe(true);
        }
      });
    },
  );
});
