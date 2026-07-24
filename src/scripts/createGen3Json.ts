const fs = require("fs");

import { buildPokemonJson } from "./buildPokemonJson";
import { fetchPokemon } from "./fetchPokemon";
import { fetchSpecies } from "./fetchSpecies";
import { computeRarity } from "./computeRarity";

const START_ID = 252;
const END_ID = 386;
const GENERATION = 3;

async function main() {
  const pokemons = [];

  for (let id = START_ID; id <= END_ID; id++) {
    console.log(`Fetching Pokémon ${id}...`);
    try {
      const pokemon = await fetchPokemon(id);
      const species = await fetchSpecies(id);
      const rarityResult = await computeRarity(id);
      const p = buildPokemonJson(pokemon, species, id, rarityResult.rarity);
      pokemons.push({ ...p, generation: GENERATION });
    } catch (err) {
      console.error(err);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(
    "data/pokemon-gen3.json",
    JSON.stringify(pokemons, null, 2),
    "utf8",
  );
  console.log("Fichier data/pokemon-gen3.json généré.");
  console.log(
    "Champ manquant : zones (à ajouter manuellement / via un script d'injection dédié, comme pour les générations précédentes).",
  );
}

main().catch(console.error);
