// scripts/injectZones.ts
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import zonesData from "../../../data/zones_unlocked.json";

// ⚙️ Chemins à adapter selon ton projet
const POKEMON_JSON_PATH = path.resolve(
  __dirname,
  "../../../data/pokemon-gen2.json",
); // fichier d'origine avec les Pokémon
const CSV_PATH = path.resolve(__dirname, "../../../data/zone_par_pokemon_2.csv");
const OUTPUT_PATH = path.resolve(
  __dirname,
  "../../../data/pokemon-gen2-with-zones.json",
); // écrase l'original, changer si besoin

// Lecture des fichiers
const pokemonList = JSON.parse(fs.readFileSync(POKEMON_JSON_PATH, "utf-8"));
const csvContent = fs.readFileSync(CSV_PATH, "utf-8");

// Parsing du CSV
const rows: Record<string, string>[] = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
});

// Construire le mapping label français -> id anglais
const labelToId = new Map<string, string>();
for (const zone of [...zonesData.gen1, ...zonesData.gen2]) {
  labelToId.set(zone.label.toLowerCase().trim(), zone.id);
}

// Construction du mapping id -> zones[]
const zoneMap = new Map<number, string[]>();

for (const row of rows) {
  const idStr = (row["Number"] ?? row["id"])?.trim();
  if (!idStr || isNaN(Number(idStr))) continue;

  const id = parseInt(idStr, 10);
  const zones = Object.entries(row)
    .filter(
      ([key, value]) =>
        key !== "Number" && value.trim().toUpperCase() === "TRUE",
    )
    .map(([key]) => {
      const id = labelToId.get(key.toLowerCase().trim());
      if (!id) console.warn(`⚠️  Zone non trouvée dans zones.json : "${key}"`);
      return id ?? key; // fallback sur le label si pas trouvé
    })
    .filter(Boolean);

  zoneMap.set(id, zones);
}

// Injection de la clé "zones" dans chaque Pokémon
let matched = 0;
let missing: number[] = [];

const updated = pokemonList.map((pokemon: { id: number }) => {
  if (zoneMap.has(pokemon.id)) {
    matched++;
    return { ...pokemon, zones: zoneMap.get(pokemon.id) };
  } else {
    missing.push(pokemon.id);
    return { ...pokemon, zones: [] };
  }
});

// Écriture du fichier de sortie
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(updated, null, 2), "utf-8");

console.log(`✅ ${matched} Pokémon mis à jour avec leurs zones`);
if (missing.length > 0) {
  console.warn(
    `⚠️  ${missing.length} Pokémon sans correspondance dans le CSV : IDs ${missing.join(", ")}`,
  );
}
console.log(`📁 Fichier généré : ${OUTPUT_PATH}`);
