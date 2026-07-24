import * as fs from "fs";
import { RARITY_ORDER, Rarity } from "../../config/rarity";
import { RarityResult } from "../../types/RarityResult";

interface ProdRow {
  id: number;
  name: string;
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

// Ids where the current production JSON holds a manual
// "legendary_wandering" override (applied on top of the base engine by
// applyWanderingLegendaries.ts) that computeRarity() can never produce on
// its own — always "legendary" instead. Comparing against these would
// always show a spurious diff, so they're excluded entirely.
const WANDERING_LEGENDARY_IDS = new Set([151, 243, 244, 245]);

function tierIndex(rarity: string): number {
  return RARITY_ORDER.indexOf(rarity as Rarity);
}

function main() {
  const gen1: ProdRow[] = JSON.parse(
    fs.readFileSync("data/pokemon-gen1.json", "utf8"),
  );
  const gen2: ProdRow[] = JSON.parse(
    fs.readFileSync("data/pokemon-gen2.json", "utf8"),
  );
  const prodRows = [...gen1, ...gen2];

  const audit: RarityResult[] = JSON.parse(
    fs.readFileSync("data/rarity-audit-gen1-gen2.json", "utf8"),
  );
  const auditById = new Map(audit.map((r) => [r.id, r]));

  let compared = 0;
  let matches = 0;
  const diffs: Diff[] = [];
  const unrecognizedRarity: ProdRow[] = [];
  const missingFromAudit: ProdRow[] = [];
  const excludedCount = { n: 0 };

  for (const row of prodRows) {
    const id = Number(row.id);

    if (WANDERING_LEGENDARY_IDS.has(id)) {
      excludedCount.n++;
      continue;
    }

    const prodRarity = (row.rarity ?? "").trim();
    if (!prodRarity) continue;

    if (tierIndex(prodRarity) === -1) {
      unrecognizedRarity.push(row);
      continue;
    }

    const computed = auditById.get(id);
    if (!computed) {
      missingFromAudit.push(row);
      continue;
    }

    compared++;

    if (computed.rarity === prodRarity) {
      matches++;
      continue;
    }

    diffs.push({
      id,
      name: row.name,
      manual: prodRarity as Rarity,
      computed: computed.rarity,
      distance: tierIndex(computed.rarity) - tierIndex(prodRarity),
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
  console.log(
    `Exclus (rarity légendaire itinérante appliquée manuellement, jamais produite par computeRarity): ${[...WANDERING_LEGENDARY_IDS].join(", ")} (${excludedCount.n} trouvés dans les fichiers de prod)`,
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

  console.log("\nid\tname\t\tprod\t\tcomputed\tdistance\trule");
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
  fs.writeFileSync("data/rarity-comparison-gen1-gen2.csv", csvOut, "utf8");
  console.log("\nFichier data/rarity-comparison-gen1-gen2.csv généré.");
}

main();
