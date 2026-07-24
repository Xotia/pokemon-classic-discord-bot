import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { RARITY_ORDER, Rarity } from "../../config/rarity";
import { getPokemonCatalog } from "../../utils/pokemonCatalog";
import zonesAll from "../../../data/zones_all.json";

// Lance simulateCapture.ts (1000 captures) pour chacune des zones gen3 et
// agrège les résultats dans un tableau récapitulatif unique, pour repérer
// d'un coup d'œil les zones avec trop de "fails" ou un déséquilibre de raretés.
// Usage : npx ts-node src/scripts/zones/simulateGen3Zones.ts [total=1000] [guildId=simulation]

const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");
const SIMULATIONS_DIR = path.join(PROJECT_ROOT, "data", "simulations");

interface ZoneSummary {
  zoneId: string;
  label: string;
  available: number;
  captures: number;
  rarities: Record<Rarity, number>;
  fails: number;
  shiny: number;
  pityTriggers: number;
}

function listSimulationFiles(): Set<string> {
  if (!fs.existsSync(SIMULATIONS_DIR)) return new Set();
  return new Set(fs.readdirSync(SIMULATIONS_DIR));
}

function parseSimulationCsv(filePath: string): Omit<ZoneSummary, "zoneId" | "label" | "available"> {
  const content = fs.readFileSync(filePath, "utf-8").trim();
  const [header, ...dataLines] = content.split("\n");
  const columns = header.split(",");

  const rarities = {} as Record<Rarity, number>;
  for (const r of RARITY_ORDER) rarities[r] = 0;
  let captures = 0;
  let fails = 0;
  let shiny = 0;
  let pityTriggers = 0;

  for (const line of dataLines) {
    const values = line.split(",").map(Number);
    columns.forEach((col, i) => {
      const value = values[i] ?? 0;
      if (col === "captures") captures += value;
      else if (col === "fails") fails += value;
      else if (col === "shiny") shiny += value;
      else if (col === "pityTriggers") pityTriggers += value;
      else if ((RARITY_ORDER as readonly string[]).includes(col)) {
        rarities[col as Rarity] += value;
      }
    });
  }

  return { captures, rarities, fails, shiny, pityTriggers };
}

function runZoneSimulation(zoneId: string, total: number, guildId: string): Omit<ZoneSummary, "zoneId" | "label" | "available"> {
  const before = listSimulationFiles();

  execSync(`npx ts-node src/scripts/zones/simulateCapture.ts ${zoneId} ${total} ${guildId}`, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
  });

  const after = listSimulationFiles();
  const newFile = [...after].find((f) => !before.has(f) && f.startsWith(`${zoneId}-`));
  if (!newFile) {
    throw new Error(`Fichier de simulation introuvable pour la zone "${zoneId}"`);
  }

  return parseSimulationCsv(path.join(SIMULATIONS_DIR, newFile));
}

function formatPercent(count: number, total: number): string {
  if (total === 0) return "0.00%";
  return `${((count / total) * 100).toFixed(2)}%`;
}

async function main() {
  const [totalArg, guildIdArg] = process.argv.slice(2);
  const total = Number.isFinite(Number(totalArg)) && Number(totalArg) > 0 ? Math.floor(Number(totalArg)) : 1000;
  const guildId = guildIdArg ?? "simulation";

  const gen3Zones = (zonesAll as Record<string, { id: string; label: string }[]>).gen3 ?? [];
  if (gen3Zones.length === 0) {
    console.error('❌ Aucune zone "gen3" trouvée dans data/zones_all.json.');
    process.exit(1);
  }

  const fullCatalog = getPokemonCatalog(guildId);
  const summaries: ZoneSummary[] = [];

  for (const zone of gen3Zones) {
    const available = fullCatalog.filter((p) => p.generation === 3 && p.zones?.includes(zone.id)).length;

    console.log(`\n=== 🗺️  ${zone.label} (${zone.id}) — ${available} Pokémon disponibles ===`);
    if (available === 0) {
      console.warn(`⚠️  Zone ignorée : aucun Pokémon n'a "${zone.id}" dans son champ "zones".`);
      summaries.push({
        zoneId: zone.id,
        label: zone.label,
        available,
        captures: 0,
        rarities: RARITY_ORDER.reduce((acc, r) => ({ ...acc, [r]: 0 }), {} as Record<Rarity, number>),
        fails: 0,
        shiny: 0,
        pityTriggers: 0,
      });
      continue;
    }

    const result = runZoneSimulation(zone.id, total, guildId);
    summaries.push({ zoneId: zone.id, label: zone.label, available, ...result });
  }

  console.log("\n\n📊 RÉCAPITULATIF PAR ZONE (Gen 3)");
  console.log("=".repeat(100));
  for (const s of summaries) {
    console.log(`\n🗺️  ${s.label} (${s.zoneId}) — ${s.available} Pokémon disponibles`);
    if (s.captures === 0) {
      console.log("   (simulation non exécutée : zone vide)");
      continue;
    }
    const rarityParts = RARITY_ORDER.filter((r) => s.rarities[r] > 0)
      .map((r) => `${r}=${formatPercent(s.rarities[r], s.captures)}`)
      .join(", ");
    console.log(`   Raretés   : ${rarityParts}`);
    console.log(`   Fails     : ${formatPercent(s.fails, s.captures)}${s.fails / s.captures > 0.05 ? "  ⚠️  taux de fail élevé" : ""}`);
    console.log(`   Shiny     : ${formatPercent(s.shiny, s.captures)}`);
    console.log(`   Pity      : ${formatPercent(s.pityTriggers, s.captures)}`);
  }

  const outDir = SIMULATIONS_DIR;
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "gen3-zones-summary.csv");
  const header = ["zoneId", "label", "available", "captures", ...RARITY_ORDER, "fails", "shiny", "pityTriggers"].join(",");
  const rows = summaries.map((s) =>
    [
      s.zoneId,
      `"${s.label}"`,
      s.available,
      s.captures,
      ...RARITY_ORDER.map((r) => s.rarities[r]),
      s.fails,
      s.shiny,
      s.pityTriggers,
    ].join(","),
  );
  fs.writeFileSync(outFile, [header, ...rows].join("\n"));
  console.log(`\n💾 Récapitulatif exporté : ${path.relative(process.cwd(), outFile)}`);
}

main().catch((error) => {
  console.error("❌ Erreur simulation gen3 :", error);
  process.exit(1);
});
