import fs from 'node:fs';
import path from 'node:path';
import { Rarity, rarityList, rarityBoostedList, RARITY_ORDER } from '../config/rarity';
import { downgradeRarity } from '../methods/rarity/downgradeRarity';
import { getPityThreshold, getShinyRate } from '../config/guildSettings';
import { getPokemonCatalog } from '../utils/pokemonCatalog';
import zonesAll from '../../data/zones_all.json';
import { Pokemon } from '../types/Pokemon';
import { othermonsDb } from '../config/paths';

// Simule des captures (mêmes probabilités que getNewGatchaPokemon.ts) sans
// toucher aux fichiers de sauvegarde d'un serveur, ni spammer les logs pino.
// Usage : npx ts-node src/scripts/simulateCapture.ts <zoneId> [total=1000] [guildId]

const BATCH_SIZE = 1000;

interface BatchStats {
  batch: number;
  captures: number;
  rarities: Record<Rarity, number>;
  fails: number;
  shiny: number;
  pityTriggers: number;
}

function findGeneration(zoneId: string): string | null {
  const typedZones: Record<string, { id: string; label: string }[]> = zonesAll as any;
  for (const [generation, zones] of Object.entries(typedZones)) {
    if (zones.some((z) => z.id === zoneId)) return generation;
  }
  return null;
}

function rollRarity(pityTime: boolean): Rarity {
  const list = pityTime ? rarityBoostedList : rarityList;
  const totalWeight = list.reduce((sum, r) => sum + r.weight, 0);
  const rand = Math.random() * totalWeight;

  let cumulative = 0;
  for (const { rarity, weight } of list) {
    cumulative += weight;
    if (rand <= cumulative) return rarity;
  }
  return 'common';
}

function emptyRarityRecord(): Record<Rarity, number> {
  const record = {} as Record<Rarity, number>;
  for (const rarity of RARITY_ORDER) record[rarity] = 0;
  return record;
}

function newBatch(batch: number): BatchStats {
  return { batch, captures: 0, rarities: emptyRarityRecord(), fails: 0, shiny: 0, pityTriggers: 0 };
}

function simulateOneCapture(
  catalogByRarity: Map<Rarity, Pokemon[]>,
  pityThreshold: number,
  shinyRate: number,
  playerState: { pityCounter: number | undefined },
  pokemonCounts: Map<string, number>,
): { rarity: Rarity; found: boolean; shiny: boolean; pityTriggered: boolean } {
  let pityTime = false;
  if (playerState.pityCounter === undefined) {
    playerState.pityCounter = 0;
  } else if (playerState.pityCounter >= pityThreshold) {
    playerState.pityCounter = 0;
    pityTime = true;
  } else {
    playerState.pityCounter++;
  }

  let currentRarity = rollRarity(pityTime);

  if (['very_rare', 'epic', 'ultra_rare', 'mythic', 'legendary'].includes(currentRarity)) {
    playerState.pityCounter = 0;
  }

  let pool = catalogByRarity.get(currentRarity) ?? [];
  while (pool.length === 0) {
    const downgraded = downgradeRarity(currentRarity);
    if (!downgraded) {
      return { rarity: currentRarity, found: false, shiny: false, pityTriggered: pityTime };
    }
    currentRarity = downgraded;
    pool = catalogByRarity.get(currentRarity) ?? [];
  }

  const pokemon = pool[Math.floor(Math.random() * pool.length)];
  pokemonCounts.set(pokemon.name, (pokemonCounts.get(pokemon.name) ?? 0) + 1);

  const shiny = Math.random() < 1 / shinyRate;

  return { rarity: currentRarity, found: true, shiny, pityTriggered: pityTime };
}

function formatPercent(count: number, total: number): string {
  if (total === 0) return '0.00%';
  return `${((count / total) * 100).toFixed(2)}%`;
}

function printBatch(stats: BatchStats) {
  const parts = RARITY_ORDER.filter((r) => stats.rarities[r] > 0)
    .map((r) => `${r}=${stats.rarities[r]}`)
    .join(', ');
  console.log(
    `📦 Paquet ${stats.batch} (${stats.captures} captures) → ${parts}${stats.fails ? `, fails=${stats.fails}` : ''} | shiny=${stats.shiny} | pity=${stats.pityTriggers}`,
  );
}

async function main() {
  const [zoneId, totalArg, guildIdArg] = process.argv.slice(2);

  if (!zoneId) {
    console.error('❌ Usage : npx ts-node src/scripts/simulateCapture.ts <zoneId> [total=1000] [guildId]');
    console.error('   Zones disponibles :');
    const typedZones: Record<string, { id: string; label: string }[]> = zonesAll as any;
    for (const [generation, zones] of Object.entries(typedZones)) {
      console.error(`   - ${generation}: ${zones.map((z) => z.id).join(', ')}`);
    }
    process.exit(1);
  }

  const generation = findGeneration(zoneId);
  if (!generation) {
    console.error(`❌ Zone inconnue : "${zoneId}"`);
    process.exit(1);
  }

  const total = Number.isFinite(Number(totalArg)) && Number(totalArg) > 0 ? Math.floor(Number(totalArg)) : BATCH_SIZE;
  const guildId = guildIdArg ?? 'simulation';
  const generationNumber = Number(generation.replace('gen', ''));

  const pityThreshold = getPityThreshold(guildId);
  const shinyRate = getShinyRate(guildId);

  const fullCatalog = getPokemonCatalog(guildId);
  const catalog = fullCatalog.filter((p) => p.generation === generationNumber && p.zones?.includes(zoneId));

  if (catalog.length === 0) {
    console.error(`❌ Aucun Pokémon trouvé pour la zone "${zoneId}" (génération ${generation}).`);
    process.exit(1);
  }

  const catalogByRarity = new Map<Rarity, Pokemon[]>();
  for (const rarity of RARITY_ORDER) {
    catalogByRarity.set(rarity, catalog.filter((p) => p.rarity === rarity));
  }

  const othermonsPath = othermonsDb(guildId);
  const hasOthermons = fs.existsSync(othermonsPath);
  const othermonIds = new Set<number>(
    hasOthermons ? (JSON.parse(fs.readFileSync(othermonsPath, 'utf-8')) as Pokemon[]).map((p) => p.id) : [],
  );
  const othermonsInZone = catalog.filter((p) => othermonIds.has(p.id)).length;

  console.log(`🎯 Simulation de capture — zone="${zoneId}" (${generation}) | guild="${guildId}"`);
  console.log(`⚙️  pityThreshold=${pityThreshold} | shinyRate=1/${shinyRate} | total=${total} (paquets de ${BATCH_SIZE})`);
  console.log(`📚 Catalogue filtré : ${catalog.length} Pokémon disponibles dans cette zone (dont ${othermonsInZone} custom/othermons)`);
  if (!hasOthermons) {
    console.log(
      `⚠️  Pas de fichier othermons.json pour guild="${guildId}" (${path.relative(process.cwd(), othermonsPath)} introuvable) — les Pokémon custom d'un serveur ne seront PAS inclus. Passe le vrai guildId en 3e argument pour les inclure.`,
    );
  }
  console.log();

  const playerState: { pityCounter: number | undefined } = { pityCounter: undefined };
  const pokemonCounts = new Map<string, number>();
  const overall = newBatch(0);
  overall.batch = -1;

  const batches: BatchStats[] = [];
  let currentBatch = newBatch(1);

  for (let i = 1; i <= total; i++) {
    const result = simulateOneCapture(catalogByRarity, pityThreshold, shinyRate, playerState, pokemonCounts);

    currentBatch.captures++;
    overall.captures++;
    if (result.found) {
      currentBatch.rarities[result.rarity]++;
      overall.rarities[result.rarity]++;
    } else {
      currentBatch.fails++;
      overall.fails++;
    }
    if (result.shiny) {
      currentBatch.shiny++;
      overall.shiny++;
    }
    if (result.pityTriggered) {
      currentBatch.pityTriggers++;
      overall.pityTriggers++;
    }

    if (currentBatch.captures === BATCH_SIZE || i === total) {
      printBatch(currentBatch);
      batches.push(currentBatch);
      currentBatch = newBatch(currentBatch.batch + 1);
    }
  }

  console.log('\n📊 RÉSUMÉ GLOBAL');
  console.log(`   Total captures simulées : ${overall.captures}`);
  for (const rarity of RARITY_ORDER) {
    const count = overall.rarities[rarity];
    if (count === 0) continue;
    console.log(`   - ${rarity.padEnd(11)} : ${String(count).padStart(6)} (${formatPercent(count, overall.captures)})`);
  }
  console.log(`   - fails (aucun mon)  : ${String(overall.fails).padStart(6)} (${formatPercent(overall.fails, overall.captures)})`);
  console.log(`   - shiny              : ${String(overall.shiny).padStart(6)} (${formatPercent(overall.shiny, overall.captures)}) — attendu ~${formatPercent(1, shinyRate)}`);
  console.log(`   - pity déclenché     : ${String(overall.pityTriggers).padStart(6)} (${formatPercent(overall.pityTriggers, overall.captures)})`);

  const topPokemons = [...pokemonCounts.entries()].sort(([, a], [, b]) => b - a).slice(0, 15);
  console.log('\n🏆 TOP 15 POKÉMON CAPTURÉS :');
  topPokemons.forEach(([name, count], i) => {
    console.log(`   ${String(i + 1).padStart(2)}. ${name.padEnd(20)} → ${count} (${formatPercent(count, overall.captures)})`);
  });

  const outDir = path.resolve(__dirname, '..', '..', 'data', 'simulations');
  fs.mkdirSync(outDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(outDir, `${zoneId}-${timestamp}.csv`);

  const header = ['batch', 'captures', ...RARITY_ORDER, 'fails', 'shiny', 'pityTriggers'].join(',');
  const rows = batches.map((b) =>
    [b.batch, b.captures, ...RARITY_ORDER.map((r) => b.rarities[r]), b.fails, b.shiny, b.pityTriggers].join(','),
  );
  fs.writeFileSync(outFile, [header, ...rows].join('\n'));

  console.log(`\n💾 Détail par paquet de ${BATCH_SIZE} exporté : ${path.relative(process.cwd(), outFile)}`);
}

main().catch((error) => {
  console.error('❌ Erreur simulation :', error);
  process.exit(1);
});
