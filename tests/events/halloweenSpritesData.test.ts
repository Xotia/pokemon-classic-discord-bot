import { describe, expect, it } from "vitest";

import sprites from "../../data/halloween-sprites.json";
import { getPokemonCatalog } from "../../src/utils/pokemonCatalog";

// Fichier rempli à la main : une faute de frappe dans un id ou une URL ne se
// verrait que le 31, sur Discord.
describe("data/halloween-sprites.json", () => {
  const catalogIds = new Set(getPokemonCatalog("halloween-sprites-test").map((p) => p.id));

  it("ne surcharge que des Pokémon du catalogue, avec des URL https", () => {
    for (const [id, entry] of Object.entries(sprites as Record<string, { image?: string; shinyImage?: string }>)) {
      expect(catalogIds.has(Number(id)), `id ${id} absent du catalogue`).toBe(true);
      for (const url of [entry.image, entry.shinyImage].filter(Boolean)) {
        expect(url).toMatch(/^https:\/\//);
      }
    }
  });
});
