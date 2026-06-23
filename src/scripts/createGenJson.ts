const fs = require("fs");

import { buildPokemonJson } from "./buildPokemonJson";
import { fetchPokemon } from "./fetchPokemon";
import { fetchSpecies } from "./fetchSpecies";

const START_ID = 1;
const END_ID = 151;

async function main() {
  const pokemons = [];


  for (let id = START_ID; id <= END_ID; id++) {
    console.log(`Fetching Pokémon ${id}...`);
    try {
      const pokemon = await fetchPokemon(id);
      const species = await fetchSpecies(id);
      const p = buildPokemonJson(pokemon, species, id);
      pokemons.push(p);
    } catch (err) {
      console.error(err);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(
    "data/pokemon-gen1.json",
    JSON.stringify(pokemons, null, 2),
    "utf8",
  );
  console.log("Fichier data/pokemon-gen1.json généré.");
}

main().catch(console.error);
