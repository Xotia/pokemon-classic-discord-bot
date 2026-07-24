// scripts/regenerateEffectiveness.ts
import * as fs from "fs";
import * as path from "path";
import getMultipliers from "../utils/getMultipliers";

const GEN_FILES = [
  "pokemon-gen1.json",
  "pokemon-gen2.json",
  "pokemon-gen3.json",
];

for (const fileName of GEN_FILES) {
  const filePath = path.resolve(__dirname, "../../data", fileName);
  const pokemonList = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  let changed = 0;
  const updated = pokemonList.map((pokemon: any) => {
    const newEffectiveness = getMultipliers(pokemon.types);
    if (JSON.stringify(newEffectiveness) !== JSON.stringify(pokemon.effectiveness)) {
      changed++;
    }
    return { ...pokemon, effectiveness: newEffectiveness };
  });

  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + "\n", "utf-8");

  console.log(`✅ ${fileName}: ${changed}/${updated.length} Pokémon avec effectiveness modifiée`);
}
