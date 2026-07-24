// scripts/applyGen1Gen2RarityChanges.ts
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { RARITY_ORDER, rarityList, Rarity } from "../../config/rarity";

// ⚙️ Chemins
const CSV_PATH = path.resolve(__dirname, "../../../data/gen1_2_rarity_change.csv");
const GEN1_JSON_PATH = path.resolve(__dirname, "../../../data/pokemon-gen1.json");
const GEN2_JSON_PATH = path.resolve(__dirname, "../../../data/pokemon-gen2.json");
const CHANGELOG_CSV_PATH = path.resolve(
  __dirname,
  "../../../data/rarity-changelog-gen1-gen2.csv",
);

interface PokemonEntry {
  id: number;
  name: string;
  rarity?: string;
  [key: string]: unknown;
}

interface ChangeRow {
  id: number;
  name: string;
  csv: string;
}

const rarityLabels = new Map<string, string>(
  rarityList.map((r) => [r.rarity, r.french]),
);

function isValidRarity(value: string): value is Rarity {
  return (RARITY_ORDER as readonly string[]).includes(value);
}

// Lecture des fichiers
const csvContent = fs.readFileSync(CSV_PATH, "utf-8");
const rows: Record<string, string>[] = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
});

const gen1List: PokemonEntry[] = JSON.parse(
  fs.readFileSync(GEN1_JSON_PATH, "utf-8"),
);
const gen2List: PokemonEntry[] = JSON.parse(
  fs.readFileSync(GEN2_JSON_PATH, "utf-8"),
);

// Index id -> pokemon entry, en gardant trace du fichier d'origine
const pokemonById = new Map<number, { entry: PokemonEntry; file: "gen1" | "gen2" }>();
for (const entry of gen1List) pokemonById.set(entry.id, { entry, file: "gen1" });
for (const entry of gen2List) pokemonById.set(entry.id, { entry, file: "gen2" });

let rowsRead = 0;
let applied = 0;
let noops = 0;
const skippedInvalidRarity: { id: number; name: string; computed: string }[] = [];
const skippedMissingId: { id: number; name: string }[] = [];

const changes: { id: number; name: string; oldRarity: string; newRarity: string }[] = [];

let gen1Changed = false;
let gen2Changed = false;

for (const row of rows) {
  rowsRead++;

  const idStr = (row["id"] ?? "").trim();
  const name = (row["name"] ?? "").trim();
  const computed = (row["computed"] ?? "").trim();

  if (!idStr || isNaN(Number(idStr))) {
    skippedMissingId.push({ id: NaN, name });
    continue;
  }
  const id = parseInt(idStr, 10);

  const found = pokemonById.get(id);
  if (!found) {
    skippedMissingId.push({ id, name });
    continue;
  }

  if (!isValidRarity(computed)) {
    skippedInvalidRarity.push({ id, name, computed });
    console.warn(
      `⚠️  Ligne ignorée : rareté "${computed}" invalide pour ${name} (id ${id}).`,
    );
    continue;
  }

  const { entry, file } = found;
  const oldRarity = entry.rarity ?? "unknown";

  if (oldRarity === computed) {
    noops++;
    continue;
  }

  entry.rarity = computed;
  applied++;
  changes.push({ id, name: entry.name ?? name, oldRarity, newRarity: computed });

  if (file === "gen1") gen1Changed = true;
  else gen2Changed = true;
}

// Écriture en place des fichiers gen1/gen2
if (gen1Changed) {
  fs.writeFileSync(
    GEN1_JSON_PATH,
    JSON.stringify(gen1List, null, 2) + "\n",
    "utf-8",
  );
  console.log(`✅ ${path.relative(process.cwd(), GEN1_JSON_PATH)} mis à jour.`);
}
if (gen2Changed) {
  fs.writeFileSync(
    GEN2_JSON_PATH,
    JSON.stringify(gen2List, null, 2) + "\n",
    "utf-8",
  );
  console.log(`✅ ${path.relative(process.cwd(), GEN2_JSON_PATH)} mis à jour.`);
}

// Génération du changelog joueur (uniquement les changements réels), trié par id croissant
const sortedChanges = [...changes].sort((a, b) => a.id - b.id);

const changelogHeader = "id,name,oldRarity,oldRarityLabel,newRarity,newRarityLabel";
const changelogLines = sortedChanges.map((c) => {
  const oldLabel = rarityLabels.get(c.oldRarity) ?? c.oldRarity;
  const newLabel = rarityLabels.get(c.newRarity) ?? c.newRarity;
  return `${c.id},${c.name},${c.oldRarity},${oldLabel},${c.newRarity},${newLabel}`;
});
fs.writeFileSync(
  CHANGELOG_CSV_PATH,
  [changelogHeader, ...changelogLines].join("\n") + "\n",
  "utf-8",
);
console.log(
  `✅ ${path.relative(process.cwd(), CHANGELOG_CSV_PATH)} généré (${sortedChanges.length} changement(s)).`,
);

// Résumé console
console.log("");
console.log("📊 Résumé :");
console.log(`   Lignes lues dans le CSV d'entrée : ${rowsRead}`);
console.log(`   Changements appliqués : ${applied}`);
console.log(`   No-ops (valeur déjà à jour) : ${noops}`);
console.log(
  `   Lignes ignorées (rareté invalide) : ${skippedInvalidRarity.length}`,
);
if (skippedInvalidRarity.length > 0) {
  console.log(
    `     IDs : ${skippedInvalidRarity.map((s) => s.id).join(", ")}`,
  );
}
console.log(
  `   Lignes ignorées (id introuvable) : ${skippedMissingId.length}`,
);
if (skippedMissingId.length > 0) {
  console.log(`     IDs : ${skippedMissingId.map((s) => s.id).join(", ")}`);
}
