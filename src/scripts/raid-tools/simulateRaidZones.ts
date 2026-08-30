import fs from "node:fs";
import dotenv from "dotenv";
import { generateRaidState } from "../../features/raid/raidGenerator.service";
import { getLoggerForGuild } from "../../utils/logger";
import { zonesUnlockedDb } from "../../config/paths";

dotenv.config();

// Tire N raids via generateRaidState() (le vrai chemin de code de prod, pas
// une réimplémentation) et affiche des stats sur la fréquence des nouvelles
// zones par génération. Lecture seule : rien n'est écrit dans data/.
// Usage : npx ts-node src/scripts/raid-tools/simulateRaidZones.ts [--guild=<id>] [--runs=<n>]

type GenerationKey = "gen1" | "gen2" | "gen3";
type ZonesUnlockedDb = Record<GenerationKey, { id: string; label: string }[]>;

const DEFAULT_GUILD_ID = "290111096201936896";
const DEFAULT_RUNS = 10000;

function parseArg(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function loadUnlockedLabelsByGen(guildId: string): Record<GenerationKey, Set<string>> {
  const raw = fs.readFileSync(zonesUnlockedDb(guildId), "utf-8");
  const db = JSON.parse(raw) as ZonesUnlockedDb;

  return {
    gen1: new Set((db.gen1 ?? []).map((z) => z.label)),
    gen2: new Set((db.gen2 ?? []).map((z) => z.label)),
    gen3: new Set((db.gen3 ?? []).map((z) => z.label)),
  };
}

function formatPercent(count: number, total: number): string {
  if (total === 0) return "0.00%";
  return `${((count / total) * 100).toFixed(2)}%`;
}

function incrementInMap(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function printZoneDistribution(title: string, distribution: Map<string, number>, total: number): void {
  console.log(`\n${title}`);
  if (distribution.size === 0) {
    console.log("  (aucun tirage)");
    return;
  }
  const sorted = [...distribution.entries()].sort((a, b) => b[1] - a[1]);
  for (const [label, count] of sorted) {
    console.log(`  ${label} : ${count} (${formatPercent(count, total)})`);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const guildId = parseArg(argv, "guild") ?? DEFAULT_GUILD_ID;
  const runsArg = parseArg(argv, "runs");
  const runs = runsArg && Number.isFinite(Number(runsArg)) && Number(runsArg) > 0
    ? Math.floor(Number(runsArg))
    : DEFAULT_RUNS;

  // Coupe le bruit de logs de pickRaidZone (un logger.info par tirage) sans
  // toucher à la logique de prod : on baisse simplement le niveau du logger
  // pino déjà instancié pour cette guilde.
  getLoggerForGuild(guildId).level = "silent";

  const unlockedLabelsByGen = loadUnlockedLabelsByGen(guildId);

  let newZoneCount = 0;
  let existingZoneCount = 0;
  const newZoneByGen: Record<GenerationKey, number> = { gen1: 0, gen2: 0, gen3: 0 };
  const totalByGen: Record<GenerationKey, number> = { gen1: 0, gen2: 0, gen3: 0 };
  const zoneDistributionByGen: Record<GenerationKey, Map<string, number>> = {
    gen1: new Map(),
    gen2: new Map(),
    gen3: new Map(),
  };
  const failures: { message: string }[] = [];

  for (let i = 0; i < runs; i++) {
    try {
      const state = await generateRaidState(guildId);
      const genKey = `gen${state.generation}` as GenerationKey;
      const label = state.zone ?? "(zone inconnue)";

      totalByGen[genKey] += 1;
      incrementInMap(zoneDistributionByGen[genKey], label);

      const isNewZone = !unlockedLabelsByGen[genKey].has(label);
      if (isNewZone) {
        newZoneCount += 1;
        newZoneByGen[genKey] += 1;
      } else {
        existingZoneCount += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ message });
    }
  }

  const successCount = runs - failures.length;

  console.log(`\nSimulation de ${runs} raids (guildId=${guildId})`);
  console.log("=".repeat(60));

  console.log(`\nRaids réussis     : ${successCount} (${formatPercent(successCount, runs)})`);
  console.log(`Échecs de génération : ${failures.length} (${formatPercent(failures.length, runs)})`);

  console.log(`\nRaids en zone déjà débloquée : ${existingZoneCount} (${formatPercent(existingZoneCount, successCount)})`);
  console.log(`Raids en nouvelle zone       : ${newZoneCount} (${formatPercent(newZoneCount, successCount)})`);

  console.log("\nNouvelles zones par génération :");
  for (const genKey of ["gen1", "gen2", "gen3"] as GenerationKey[]) {
    console.log(`  ${genKey} : ${newZoneByGen[genKey]} (${formatPercent(newZoneByGen[genKey], successCount)})`);
  }

  console.log("\nTotal de raids par génération :");
  for (const genKey of ["gen1", "gen2", "gen3"] as GenerationKey[]) {
    console.log(`  ${genKey} : ${totalByGen[genKey]} (${formatPercent(totalByGen[genKey], successCount)})`);
  }

  for (const genKey of ["gen1", "gen2", "gen3"] as GenerationKey[]) {
    printZoneDistribution(
      `Distribution des zones tirées (${genKey}) :`,
      zoneDistributionByGen[genKey],
      totalByGen[genKey],
    );
  }

  if (failures.length > 0) {
    console.log("\nDétail des échecs :");
    const failureCounts = new Map<string, number>();
    for (const failure of failures) {
      incrementInMap(failureCounts, failure.message);
    }
    const sorted = [...failureCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [message, count] of sorted) {
      console.log(`  [${count}x] ${message}`);
    }
  }
}

main().catch((error) => {
  console.error("Erreur simulation raid zones :", error);
  process.exit(1);
});
