import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { RARITY_ORDER, Rarity } from "../../config/rarity";
import { RarityResult } from "../../types/RarityResult";

interface ManualRow {
  id: string;
  name: string;
  real_name: string;
  "type 1": string;
  "type 2": string;
  rarity: string;
}

interface Diff {
  id: number;
  name: string;
  manual: Rarity;
  computed: Rarity;
  distance: number;
  appliedRule: string;
  finalScore: number | null;
  maxEncounterChance: number | null;
  gamesCount: number | null;
  easiestMethod: string | null;
  evolutionDepth: number | null;
  oneTimeOnly: boolean;
  flooredByChain: boolean;
}

function tierIndex(rarity: string): number {
  return RARITY_ORDER.indexOf(rarity as Rarity);
}

function main() {
  const manualCsvPath = process.argv[2];
  if (!manualCsvPath) {
    console.error(
      "Usage: npx ts-node src/scripts/rarity/compareRarityWithManual.ts <chemin-vers-csv-manuel>",
    );
    process.exit(1);
  }

  const manualRaw = fs.readFileSync(manualCsvPath, "utf8");
  const manualRows: ManualRow[] = parse(manualRaw, {
    columns: true,
    skip_empty_lines: true,
  });

  const audit: RarityResult[] = JSON.parse(
    fs.readFileSync("data/rarity-audit-gen3.json", "utf8"),
  );
  const auditById = new Map(audit.map((r) => [r.id, r]));

  let compared = 0;
  let matches = 0;
  const diffs: Diff[] = [];
  const unrecognizedRarity: ManualRow[] = [];
  const missingFromAudit: ManualRow[] = [];

  for (const row of manualRows) {
    const id = Number(row.id);
    const manualRarity = (row.rarity ?? "").trim();
    if (!manualRarity) continue; // saisie manuelle pas encore faite pour ce Pokémon

    if (tierIndex(manualRarity) === -1) {
      unrecognizedRarity.push(row);
      continue;
    }

    const computed = auditById.get(id);
    if (!computed) {
      missingFromAudit.push(row);
      continue;
    }

    compared++;

    if (computed.rarity === manualRarity) {
      matches++;
      continue;
    }

    diffs.push({
      id,
      name: row.name,
      manual: manualRarity as Rarity,
      computed: computed.rarity,
      distance: tierIndex(computed.rarity) - tierIndex(manualRarity),
      appliedRule: computed.appliedRule,
      finalScore: computed.finalScore,
      maxEncounterChance: computed.rawData?.maxEncounterChance ?? null,
      gamesCount: computed.rawData?.gamesCount ?? null,
      easiestMethod: computed.rawData?.easiestMethod ?? null,
      evolutionDepth: computed.rawData?.evolutionDepth ?? null,
      oneTimeOnly: computed.oneTimeOnly,
      flooredByChain: computed.flooredByChain,
    });
  }

  diffs.sort((a, b) => Math.abs(b.distance) - Math.abs(a.distance));

  console.log(
    `Comparés: ${compared} | Identiques: ${matches} | Différents: ${diffs.length}`,
  );
  if (unrecognizedRarity.length > 0) {
    console.log(
      `Valeurs de rareté non reconnues (ids): ${unrecognizedRarity
        .map((r) => r.id)
        .join(", ")}`,
    );
  }
  if (missingFromAudit.length > 0) {
    console.log(
      `Absents de l'audit (ids): ${missingFromAudit.map((r) => r.id).join(", ")}`,
    );
  }

  console.log("\nid\tname\t\tmanual\t\tcomputed\tdistance\trule");
  console.log("--\t----\t\t------\t\t--------\t--------\t----");
  for (const d of diffs) {
    console.log(
      `${d.id}\t${d.name}\t${d.manual}\t${d.computed}\t${d.distance}\t${d.appliedRule}`,
    );
  }

  const header =
    "id,name,manual,computed,distance,appliedRule,finalScore,maxEncounterChance,gamesCount,easiestMethod,evolutionDepth,oneTimeOnly,flooredByChain";
  const csvOut = [
    header,
    ...diffs.map((d) =>
      [
        d.id,
        d.name,
        d.manual,
        d.computed,
        d.distance,
        d.appliedRule,
        d.finalScore ?? "",
        d.maxEncounterChance ?? "",
        d.gamesCount ?? "",
        d.easiestMethod ?? "",
        d.evolutionDepth ?? "",
        d.oneTimeOnly,
        d.flooredByChain,
      ].join(","),
    ),
  ].join("\n");
  fs.writeFileSync("data/rarity-comparison-gen3.csv", csvOut, "utf8");
  console.log("\nFichier data/rarity-comparison-gen3.csv généré.");
}

main();
