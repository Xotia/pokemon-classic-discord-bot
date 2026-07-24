const fs = require("fs");

import { computeRarity } from "./computeRarity";

// Gen 3 (Hoenn) range, matching START_ID/END_ID in src/utils/createGenJson.js
const START_ID = 252;
const END_ID = 386;

async function main() {
  const results = [];

  for (let id = START_ID; id <= END_ID; id++) {
    console.log(`Fetching rarity for ${id}...`);
    try {
      const result = await computeRarity(id);
      results.push(result);
    } catch (err) {
      console.error(err);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(
    "data/rarity-audit-gen3.json",
    JSON.stringify(results, null, 2),
    "utf8",
  );
  console.log("Fichier data/rarity-audit-gen3.json généré.");

  console.log("\nid\tname\t\trarity\t\tfinalScore");
  console.log("--\t----\t\t------\t\t----------");
  for (const r of results as any[]) {
    const score = r.finalScore === null ? "-" : r.finalScore.toFixed(2);
    console.log(`${r.id}\t${r.name}\t${r.rarity}\t${score}`);
  }
}

main().catch(console.error);
