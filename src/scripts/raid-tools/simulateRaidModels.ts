/**
 * Simulation comparative des deux modèles de résolution de raid.
 *
 * Modèle A (actuel)  : stat équipe X  vs stat boss X   (miroir)
 * Modèle B (proposé) : Def/DefSpe équipe vs Atq/AtqSpe boss,
 *                      Atq/AtqSpe équipe vs Def/DefSpe boss,
 *                      Vitesse vs Vitesse.
 *
 * L'agrégation d'équipe (somme + multiplicateurs de type) est celle de
 * computeBruteRaidResult, vérifiée contre la vraie fonction au démarrage.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { computeBruteRaidResult } from "../../features/raid/computeBruteRaidResult";

type Stats = {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
};

type PokemonEntry = {
  id: number;
  name: string;
  rarity: string;
  types: string[];
  effectiveness: { defense: Record<string, number>; attack: Record<string, number> };
  stats: Stats;
  zones?: string[];
};

type ZoneEntry = { id: string; label: string };

const REPO = path.resolve(__dirname, "../../..");
const GUILD = "290111096201936896";

const STAT_KEYS = ["attack", "specialAttack", "defense", "specialDefense", "speed"] as const;
type StatKey = (typeof STAT_KEYS)[number];

/** Modèle B : quelle stat du boss chaque stat d'équipe affronte. */
const CROSSED: Record<StatKey, StatKey> = {
  defense: "attack",
  specialDefense: "specialAttack",
  attack: "defense",
  specialAttack: "specialDefense",
  speed: "speed",
};

function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, "utf8")) as T;
}

function emptyStats(): Stats {
  return { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
}

function multiplyStats(stats: Stats, m: number): Stats {
  return {
    hp: stats.hp * m,
    attack: stats.attack * m,
    defense: stats.defense * m,
    specialAttack: stats.specialAttack * m,
    specialDefense: stats.specialDefense * m,
    speed: stats.speed * m,
  };
}

function eff(table: Record<string, number> | undefined, type: string | undefined): number {
  if (!type) return 1;
  return table?.[type] ?? 1;
}

type Defender = { pokemon: PokemonEntry; attackType: string };

/** Agrégation identique à computeBruteRaidResult. */
function aggregate(defenders: Defender[], bossAttackType: string, bossDefEff: Record<string, number>): Stats {
  return defenders.reduce<Stats>((total, d) => {
    const s = d.pokemon.stats;
    const atkEff = eff(bossDefEff, d.attackType);
    const bossEff = eff(d.pokemon.effectiveness.defense, bossAttackType);

    total.hp += s.hp;
    total.attack += s.attack * atkEff;
    total.specialAttack += s.specialAttack * atkEff;
    total.defense += s.defense / bossEff;
    total.specialDefense += s.specialDefense / bossEff;
    total.speed += s.speed;
    return total;
  }, emptyStats());
}

function missingA(team: Stats, boss: Stats): StatKey[] {
  return STAT_KEYS.filter((k) => team[k] <= boss[k]);
}

function missingB(team: Stats, boss: Stats): StatKey[] {
  return STAT_KEYS.filter((k) => team[k] <= boss[CROSSED[k]]);
}

// --- Chargement des données -------------------------------------------------

const catalogs: Record<string, PokemonEntry[]> = {
  gen1: readJson<PokemonEntry[]>(path.join(REPO, "data/pokemon-gen1.json")),
  gen2: readJson<PokemonEntry[]>(path.join(REPO, "data/pokemon-gen2.json")),
  gen3: readJson<PokemonEntry[]>(path.join(REPO, "data/pokemon-gen3.json")),
};

const unlocked = readJson<Record<string, ZoneEntry[]>>(
  path.join(REPO, `data/guilds/${GUILD}/zones_unlocked.json`),
);
const toUnlock = readJson<Record<string, ZoneEntry[]>>(
  path.join(REPO, `data/guilds/${GUILD}/zones_to_unlock.json`),
);

/** Zones qu'un raid peut réellement tirer : débloquées + la prochaine (25% de chance). */
function raidableZones(gen: string): ZoneEntry[] {
  const current = unlocked[gen] ?? [];
  const ids = new Set(current.map((z) => z.id));
  const next = (toUnlock[gen] ?? []).find((z) => !ids.has(z.id));
  return next ? [...current, next] : current;
}

const isLegendary = (p: PokemonEntry) =>
  p.rarity === "legendary" || p.rarity === "legendary_wandering";

type BossCandidate = { gen: string; zone: ZoneEntry; pokemon: PokemonEntry };

const bosses: BossCandidate[] = [];
for (const gen of ["gen1", "gen2", "gen3"]) {
  for (const zone of raidableZones(gen)) {
    for (const p of catalogs[gen]) {
      if (p.zones?.includes(zone.id) && !isLegendary(p)) {
        bosses.push({ gen, zone, pokemon: p });
      }
    }
  }
}

/** Vivier des défenseurs : ce que les joueurs peuvent posséder = zones débloquées. */
const defenderPool: PokemonEntry[] = [];
{
  const seen = new Set<number>();
  for (const gen of ["gen1", "gen2", "gen3"]) {
    const ids = new Set((unlocked[gen] ?? []).map((z) => z.id));
    for (const p of catalogs[gen]) {
      if (p.zones?.some((z) => ids.has(z)) && !seen.has(p.id)) {
        seen.add(p.id);
        defenderPool.push(p);
      }
    }
  }
}

// --- Vérification de fidélité contre le vrai moteur -------------------------

function checkFidelity(): void {
  const boss = bosses[0];
  const finalStats = multiplyStats(boss.pokemon.stats, 3);
  const team: Defender[] = defenderPool.slice(0, 4).map((p) => ({ pokemon: p, attackType: p.types[0] }));
  const mine = aggregate(team, boss.pokemon.types[0], boss.pokemon.effectiveness.defense);

  const state = {
    raidPokemon: {
      attackType: boss.pokemon.types[0],
      defenseEffectiveness: boss.pokemon.effectiveness.defense,
      finalStats,
    },
    defenders: team.map((d) => ({
      attackType: d.attackType,
      snapshot: { defenseEffectiveness: d.pokemon.effectiveness.defense, stats: d.pokemon.stats },
    })),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const real = computeBruteRaidResult(state as any);

  for (const k of STAT_KEYS) {
    if (Math.abs(real.teamStats[k] - mine[k]) > 1e-9) {
      throw new Error(`Agrégation divergente sur ${k}: ${real.teamStats[k]} vs ${mine[k]}`);
    }
  }
  if (real.missingStats.join(",") !== missingA(mine, finalStats).join(",")) {
    throw new Error("Verdict modèle A divergent du moteur réel");
  }
  console.log("Fidélité vérifiée : agrégation et verdict A identiques à computeBruteRaidResult.\n");
}

// --- Simulation -------------------------------------------------------------

const RUNS = 300;
const MAX_TEAM = 14;
const DIFFICULTIES = [2, 3, 4, 5];

function randomTeam(size: number): Defender[] {
  const team: Defender[] = [];
  for (let i = 0; i < size; i++) {
    const p = defenderPool[Math.floor(Math.random() * defenderPool.length)];
    team.push({ pokemon: p, attackType: p.types[Math.floor(Math.random() * p.types.length)] });
  }
  return team;
}

type Row = {
  gen: string;
  zone: string;
  boss: string;
  difficulty: number;
  minTeamA: number | null;
  minTeamB: number | null;
};

const rows: Row[] = [];
const gateFailA: Record<StatKey, number> = { attack: 0, specialAttack: 0, defense: 0, specialDefense: 0, speed: 0 };
const gateFailB: Record<StatKey, number> = { attack: 0, specialAttack: 0, defense: 0, specialDefense: 0, speed: 0 };
let gateSamples = 0;

// Taux de victoire global par taille d'équipe
const winA = new Array(MAX_TEAM + 1).fill(0);
const winB = new Array(MAX_TEAM + 1).fill(0);
const trials = new Array(MAX_TEAM + 1).fill(0);

checkFidelity();
console.log(`Boss candidats : ${bosses.length} | vivier défenseurs : ${defenderPool.length}`);
console.log(`Difficultés : ${DIFFICULTIES.join(",")} | ${RUNS} tirages d'équipe par point\n`);

for (const b of bosses) {
  for (const difficulty of DIFFICULTIES) {
    const bossStats = multiplyStats(b.pokemon.stats, difficulty);
    let minA: number | null = null;
    let minB: number | null = null;

    for (let size = 1; size <= MAX_TEAM; size++) {
      let okA = 0;
      let okB = 0;

      for (let r = 0; r < RUNS; r++) {
        const bossAttackType = b.pokemon.types[Math.floor(Math.random() * b.pokemon.types.length)];
        const team = aggregate(randomTeam(size), bossAttackType, b.pokemon.effectiveness.defense);
        const mA = missingA(team, bossStats);
        const mB = missingB(team, bossStats);
        if (mA.length === 0) okA++;
        if (mB.length === 0) okB++;
        for (const k of mA) gateFailA[k]++;
        for (const k of mB) gateFailB[k]++;
        gateSamples++;
      }

      winA[size] += okA;
      winB[size] += okB;
      trials[size] += RUNS;

      if (minA === null && okA / RUNS >= 0.5) minA = size;
      if (minB === null && okB / RUNS >= 0.5) minB = size;
    }

    rows.push({
      gen: b.gen,
      zone: b.zone.label,
      boss: b.pokemon.name,
      difficulty,
      minTeamA: minA,
      minTeamB: minB,
    });
  }
}

// --- Restitution ------------------------------------------------------------

console.log("Taux de victoire global par taille d'équipe (tous boss, toutes difficultés)");
console.log("taille | modèle A (actuel) | modèle B (croisé)");
for (let size = 1; size <= MAX_TEAM; size++) {
  const a = ((winA[size] / trials[size]) * 100).toFixed(1).padStart(6);
  const bb = ((winB[size] / trials[size]) * 100).toFixed(1).padStart(6);
  console.log(`${String(size).padStart(6)} | ${a} %          | ${bb} %`);
}

console.log("\nFréquence d'échec par axe (part des verdicts d'échec où l'axe bloque)");
console.log("axe             | modèle A | modèle B");
for (const k of STAT_KEYS) {
  const a = ((gateFailA[k] / gateSamples) * 100).toFixed(1).padStart(6);
  const bb = ((gateFailB[k] / gateSamples) * 100).toFixed(1).padStart(6);
  console.log(`${k.padEnd(15)} | ${a} % | ${bb} %`);
}

const NEVER = MAX_TEAM + 1;
const deltas = rows.map((r) => (r.minTeamB ?? NEVER) - (r.minTeamA ?? NEVER));
const harder = deltas.filter((d) => d > 0).length;
const easier = deltas.filter((d) => d < 0).length;
const same = deltas.filter((d) => d === 0).length;
const impossibleA = rows.filter((r) => r.minTeamA === null).length;
const impossibleB = rows.filter((r) => r.minTeamB === null).length;

console.log(`\nCouples (boss × difficulté) évalués : ${rows.length}`);
console.log(`  plus durs en B  : ${harder}`);
console.log(`  plus faciles en B: ${easier}`);
console.log(`  identiques      : ${same}`);
console.log(`  injouables (>${MAX_TEAM} défenseurs) — A : ${impossibleA}, B : ${impossibleB}`);
const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
console.log(`  écart moyen de taille d'équipe requise (B - A) : ${mean.toFixed(2)}`);

// Bande réaliste : raids déjà gagnables par l'effectif actuel du serveur.
const REALISTIC_TEAM = 8;
const realistic = rows.filter((r) => (r.minTeamA ?? NEVER) <= REALISTIC_TEAM);
const rHarder = realistic.filter((r) => (r.minTeamB ?? NEVER) > (r.minTeamA ?? NEVER)).length;
const rEasier = realistic.filter((r) => (r.minTeamB ?? NEVER) < (r.minTeamA ?? NEVER)).length;
const rOut = realistic.filter((r) => (r.minTeamB ?? NEVER) > REALISTIC_TEAM).length;
console.log(
  `\nBande réaliste (gagnables à ≤ ${REALISTIC_TEAM} défenseurs aujourd'hui) : ${realistic.length} couples`,
);
console.log(`  durcis : ${rHarder} | adoucis : ${rEasier} | sortis de la bande en B : ${rOut}`);

console.log("\nTop 10 des boss les plus DURCIS par le modèle B");
[...rows]
  .sort((a, b2) => ((b2.minTeamB ?? NEVER) - (b2.minTeamA ?? NEVER)) - ((a.minTeamB ?? NEVER) - (a.minTeamA ?? NEVER)))
  .slice(0, 10)
  .forEach((r) => console.log(`  ${r.boss} (${r.zone}, diff ${r.difficulty}) : A=${r.minTeamA ?? ">14"} → B=${r.minTeamB ?? ">14"}`));

console.log("\nTop 10 des boss les plus ADOUCIS par le modèle B");
[...rows]
  .sort((a, b2) => ((a.minTeamB ?? NEVER) - (a.minTeamA ?? NEVER)) - ((b2.minTeamB ?? NEVER) - (b2.minTeamA ?? NEVER)))
  .slice(0, 10)
  .forEach((r) => console.log(`  ${r.boss} (${r.zone}, diff ${r.difficulty}) : A=${r.minTeamA ?? ">14"} → B=${r.minTeamB ?? ">14"}`));

// CSV détaillé
const csv = [
  "gen,zone,boss,difficulty,minTeamA,minTeamB,delta",
  ...rows.map((r) =>
    [r.gen, `"${r.zone}"`, r.boss, r.difficulty, r.minTeamA ?? "", r.minTeamB ?? "", (r.minTeamB ?? NEVER) - (r.minTeamA ?? NEVER)].join(","),
  ),
].join("\n");
const out = path.join(REPO, "data/simulations", "raid-model-comparison.csv");
require("node:fs").writeFileSync(out, csv, "utf8");
console.log(`\nCSV détaillé : ${out}`);
