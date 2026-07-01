const fs = require("fs");
const path = require("path");
require("dotenv").config();

const dataDir = path.resolve(__dirname, "..", "data");
const output = path.join(dataDir, "pokemon-list.json");

if (fs.existsSync(output)) {
  console.log(`[generate-pokemon-list] pokemon-list.json existe déjà, génération ignorée.`);
  process.exit(0);
}

const defaultFiles = ["pokemon-gen1.json", "pokemon-gen2.json"];
const extraFiles = process.env.EXTRA_POKEMON_FILES
  ? process.env.EXTRA_POKEMON_FILES.split(",").map((f) => f.trim()).filter(Boolean)
  : [];

const allFiles = [...defaultFiles, ...extraFiles];
let pokemonList = [];

for (const file of allFiles) {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`[generate-pokemon-list] File not found, skipping: ${file}`);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  pokemonList = pokemonList.concat(data);
  console.log(`[generate-pokemon-list] Loaded ${data.length} Pokemon from ${file}`);
}

fs.writeFileSync(output, JSON.stringify(pokemonList, null, 2), "utf-8");
console.log(`[generate-pokemon-list] Generated pokemon-list.json with ${pokemonList.length} Pokemon`);
