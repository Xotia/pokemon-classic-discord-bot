// scripts/injectZonesGen3.ts
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import zonesAll from "../../../data/zones_all.json";

// ⚙️ Chemins
const POKEMON_JSON_PATH = path.resolve(
  __dirname,
  "../../../data/pokemon-gen3.json",
);
const CSV_PATH = path.resolve(__dirname, "../../../data/gen3_zones.csv");

// Lecture des fichiers
const pokemonList = JSON.parse(fs.readFileSync(POKEMON_JSON_PATH, "utf-8"));
const csvContent = fs.readFileSync(CSV_PATH, "utf-8");

// Parsing du CSV
const rows: Record<string, string>[] = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
});

// Construire le mapping label français -> id anglais (zones gen3 uniquement)
const labelToId = new Map<string, string>();
for (const zone of zonesAll.gen3 ?? []) {
  labelToId.set(zone.label.toLowerCase().trim(), zone.id);
}

// Construction du mapping id Pokémon -> zones[]
const zoneMap = new Map<number, string[]>();
const unknownColumns = new Set<string>();

for (const row of rows) {
  const idStr = (row["id"] ?? row["Number"])?.trim();
  if (!idStr || isNaN(Number(idStr))) continue;

  const id = parseInt(idStr, 10);
  const zones = Object.entries(row)
    .filter(
      ([key, value]) =>
        key !== "id" &&
        key !== "name" &&
        key !== "Number" &&
        (value ?? "").trim().toUpperCase() === "TRUE",
    )
    .map(([key]) => {
      const zoneId = labelToId.get(key.toLowerCase().trim());
      if (!zoneId) unknownColumns.add(key);
      return zoneId ?? key; // fallback sur le label si pas trouvé
    })
    .filter(Boolean);

  zoneMap.set(id, zones);
}

// Injection de la clé "zones" dans chaque Pokémon (fusion par id)
let matched = 0;
const missingFromCsv: number[] = [];
const emptyZones: number[] = [];

const updated = pokemonList.map((pokemon: { id: number; name: string; zones?: string[] }) => {
  if (!zoneMap.has(pokemon.id)) {
    missingFromCsv.push(pokemon.id);
    return { ...pokemon, zones: pokemon.zones ?? [] };
  }

  matched++;
  const zones = zoneMap.get(pokemon.id)!;
  if (zones.length === 0) emptyZones.push(pokemon.id);
  return { ...pokemon, zones };
});

// Écriture en place dans pokemon-gen3.json
fs.writeFileSync(
  POKEMON_JSON_PATH,
  JSON.stringify(updated, null, 2) + "\n",
  "utf-8",
);

console.log(`✅ ${matched} Pokémon mis à jour avec leurs zones dans ${path.relative(process.cwd(), POKEMON_JSON_PATH)}`);

if (unknownColumns.size > 0) {
  console.warn(
    `⚠️  ${unknownColumns.size} colonne(s) du CSV sans correspondance dans zones_all.json → gen3 : ${[...unknownColumns].join(", ")}`,
  );
}
if (missingFromCsv.length > 0) {
  console.warn(
    `⚠️  ${missingFromCsv.length} Pokémon sans ligne correspondante dans le CSV : IDs ${missingFromCsv.join(", ")}`,
  );
}
if (emptyZones.length > 0) {
  console.warn(
    `⚠️  ${emptyZones.length} Pokémon avec aucune zone cochée dans le CSV (à vérifier manuellement) : IDs ${emptyZones.join(", ")}`,
  );
}
