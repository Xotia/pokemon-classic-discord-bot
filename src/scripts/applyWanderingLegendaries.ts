// scripts/applyWanderingLegendaries.ts
import * as fs from "fs";
import * as path from "path";

// ⚙️ Mapping manuel id PokéAPI -> nom (nom utilisé uniquement pour les logs)
const WANDERING_LEGENDARY_IDS: Record<number, string> = {
  151: "Mew",
  243: "Raikou",
  244: "Entei",
  245: "Suicune",
  380: "Latias",
  381: "Latios",
};

const TARGET_FILES = [
  path.resolve(__dirname, "../../data/pokemon-gen1.json"),
  path.resolve(__dirname, "../../data/pokemon-gen2.json"),
  path.resolve(__dirname, "../../data/pokemon-gen3.json"),
];

interface PokemonEntry {
  id: number;
  name: string;
  rarity?: string;
  [key: string]: unknown;
}

const remainingIds = new Set(Object.keys(WANDERING_LEGENDARY_IDS).map(Number));
let updatedCount = 0;

for (const filePath of TARGET_FILES) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const pokemonList: PokemonEntry[] = JSON.parse(raw);

  let fileChanged = false;

  for (const pokemon of pokemonList) {
    if (!(pokemon.id in WANDERING_LEGENDARY_IDS)) continue;

    remainingIds.delete(pokemon.id);

    if (pokemon.rarity !== "legendary" && pokemon.rarity !== "legendary_wandering") {
      console.warn(
        `⚠️  ${pokemon.name} (id ${pokemon.id}) a une rareté inattendue "${pokemon.rarity}" avant application du plancher "legendary_wandering" — override appliqué quand même.`,
      );
    }

    if (pokemon.rarity !== "legendary_wandering") {
      pokemon.rarity = "legendary_wandering";
      fileChanged = true;
      updatedCount++;
    }
  }

  if (fileChanged) {
    fs.writeFileSync(
      filePath,
      JSON.stringify(pokemonList, null, 2) + "\n",
      "utf-8",
    );
    console.log(`✅ ${path.relative(process.cwd(), filePath)} mis à jour.`);
  }
}

console.log(`✅ ${updatedCount} Pokémon passés en rareté "legendary_wandering".`);

if (remainingIds.size > 0) {
  for (const id of remainingIds) {
    console.warn(
      `⚠️  Pokémon id ${id} (${WANDERING_LEGENDARY_IDS[id]}) introuvable dans les fichiers gen1/gen2/gen3.`,
    );
  }
}
