import { describe, expect, it } from "vitest";
import { buildPublishedPokedex } from "../../src/scripts/raid-tools/buildRaidSimulator";

/**
 * Le pokedex du simulateur part sur un serveur public. Ces tests verrouillent
 * ce qui en sort : le jour ou une donnee sensible est ajoutee aux fichiers
 * `data/pokemon-*.json` (ou ou quelqu'un remplace la recomposition champ par
 * champ par un simple spread), la suite doit casser avant la mise en ligne.
 */
describe("pokedex publie du simulateur de raid", () => {
  const pokedex = buildPublishedPokedex();

  const ALLOWED_TOP_LEVEL_KEYS = ["id", "name", "image", "types", "stats", "effectiveness"];

  it("contient les trois generations", () => {
    expect(pokedex.length).toBeGreaterThan(380);
  });

  it("n'expose aucun champ hors liste blanche", () => {
    for (const pokemon of pokedex) {
      expect(Object.keys(pokemon).sort()).toEqual([...ALLOWED_TOP_LEVEL_KEYS].sort());
    }
  });

  it("ne publie ni rarete, ni zones, ni generation, ni nom d'origine", () => {
    const serialized = JSON.stringify(pokedex);
    for (const forbidden of ["rarity", "zones", "generation", "originalName", "shinyImage"]) {
      expect(serialized).not.toContain(`"${forbidden}"`);
    }
  });

  it("ne publie que les efficacites DEFENSIVES", () => {
    for (const pokemon of pokedex) {
      expect(Object.keys(pokemon.effectiveness)).toEqual(["defense"]);
    }
  });

  it("expose les six stats pour chaque entree", () => {
    for (const pokemon of pokedex) {
      expect(Object.keys(pokemon.stats).sort()).toEqual([
        "attack",
        "defense",
        "hp",
        "specialAttack",
        "specialDefense",
        "speed",
      ]);
    }
  });

  it("ne contient aucun doublon d'identifiant", () => {
    const ids = pokedex.map((pokemon) => pokemon.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("est trie par identifiant", () => {
    const ids = pokedex.map((pokemon) => pokemon.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });
});
