import { computeRarity } from "./computeRarity";

async function main() {
  const ids = process.argv
    .slice(2)
    .map((arg) => Number(arg))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (ids.length === 0) {
    console.error("Usage: npx ts-node src/scripts/rarity/testRarity.ts <id> [id2] [id3...]");
    process.exit(1);
  }

  for (const id of ids) {
    const result = await computeRarity(id);
    console.log(JSON.stringify(result, null, 2));
    await new Promise((r) => setTimeout(r, 200));
  }
}

main().catch(console.error);
