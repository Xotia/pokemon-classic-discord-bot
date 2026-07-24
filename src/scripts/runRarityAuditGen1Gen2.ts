const fs = require("fs");

import { computeRarity } from "./computeRarity";
import { GEN1_VERSIONS, GEN2_VERSIONS } from "./rarityScoring";

// Gen 1 (Kanto) and Gen 2 (Johto) ranges, matching START_ID/END_ID in
// src/utils/createGenJson.js.
const GEN1_START_ID = 1;
const GEN1_END_ID = 151;
const GEN2_START_ID = 152;
const GEN2_END_ID = 251;

async function main() {
  const results = [];

  for (let id = GEN1_START_ID; id <= GEN1_END_ID; id++) {
    console.log(`Fetching rarity for ${id}...`);
    try {
      const result = await computeRarity(id, GEN1_VERSIONS);
      results.push(result);
    } catch (err) {
      console.error(err);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  for (let id = GEN2_START_ID; id <= GEN2_END_ID; id++) {
    console.log(`Fetching rarity for ${id}...`);
    try {
      const result = await computeRarity(id, GEN2_VERSIONS);
      results.push(result);
    } catch (err) {
      console.error(err);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(
    "data/rarity-audit-gen1-gen2.json",
    JSON.stringify(results, null, 2),
    "utf8",
  );
  console.log("Fichier data/rarity-audit-gen1-gen2.json généré.");

  console.log("\nid\tname\t\trarity\t\tfinalScore");
  console.log("--\t----\t\t------\t\t----------");
  for (const r of results as any[]) {
    const score = r.finalScore === null ? "-" : r.finalScore.toFixed(2);
    console.log(`${r.id}\t${r.name}\t${r.rarity}\t${score}`);
  }
}

main().catch(console.error);
