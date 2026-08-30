/**
 * Construit le simulateur de raid statique publie sur GitHub Pages.
 *
 * Sortie : dist-web/raid-simulator/ — un dossier de fichiers statiques, publie
 * tel quel par .github/workflows/deploy-raid-simulator.yml. Aucun process Node
 * ne tourne en production pour cet outil, et rien n'est heberge sur le VPS.
 *
 * Regle de securite centrale de ce script : le pokedex publie est RECONSTRUIT
 * champ par champ a partir d'une liste blanche. Les fichiers `data/` du bot
 * contiennent des informations qui n'ont rien a faire en ligne (raretes,
 * zones, et surtout, dans le reste du dossier, les donnees de joueurs). Rien
 * ne doit pouvoir sortir par accident : on ne copie jamais un objet source
 * tel quel, on recompose un objet neuf.
 */
import * as fs from "fs";
import * as path from "path";
import {
  POKEMON_GEN1_DB,
  POKEMON_GEN2_DB,
  POKEMON_GEN3_DB,
} from "../../config/paths";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");
const SOURCE_DIR = path.join(PROJECT_ROOT, "tools", "raid-simulator", "src");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "dist-web", "raid-simulator");

/** Fichiers statiques copies tels quels. Liste explicite, pas de glob. */
const STATIC_FILES = ["index.html", "style.css", "app.js", "raidSimCore.js", "favicon.svg"];

/** Les seuls champs d'un Pokemon qui partent en ligne. */
type PublishedPokemon = {
  id: number;
  name: string;
  image: string;
  types: string[];
  stats: Record<string, number>;
  effectiveness: { defense: Record<string, number> };
};

const STAT_KEYS = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
] as const;

type SourcePokemon = {
  id: number;
  name: string;
  image: string;
  types: string[];
  stats: Record<string, number>;
  effectiveness?: { defense?: Record<string, number> };
};

function readPokedexFile(filePath: string): SourcePokemon[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`${path.basename(filePath)} : tableau attendu.`);
  }
  return parsed as SourcePokemon[];
}

/**
 * Recompose une entree minimale. Toute entree incomplete fait echouer le
 * build : un pokedex partiellement valide produirait un simulateur qui
 * calcule faux sur certaines especes, ce qui est pire qu'un build rouge.
 */
function toPublishedPokemon(pokemon: SourcePokemon, source: string): PublishedPokemon {
  const label = `${source} #${pokemon?.id ?? "?"}`;

  if (typeof pokemon.id !== "number" || typeof pokemon.name !== "string") {
    throw new Error(`${label} : id ou nom manquant.`);
  }
  if (!Array.isArray(pokemon.types) || pokemon.types.length === 0) {
    throw new Error(`${label} (${pokemon.name}) : types manquants.`);
  }
  if (typeof pokemon.image !== "string" || pokemon.image.length === 0) {
    throw new Error(`${label} (${pokemon.name}) : sprite manquant.`);
  }

  const stats: Record<string, number> = {};
  for (const key of STAT_KEYS) {
    const value = pokemon.stats?.[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`${label} (${pokemon.name}) : stat "${key}" manquante ou invalide.`);
    }
    stats[key] = value;
  }

  const sourceDefense = pokemon.effectiveness?.defense;
  if (!sourceDefense || typeof sourceDefense !== "object") {
    throw new Error(`${label} (${pokemon.name}) : efficacites defensives manquantes.`);
  }
  const defense: Record<string, number> = {};
  for (const [type, multiplier] of Object.entries(sourceDefense)) {
    if (typeof multiplier !== "number" || !Number.isFinite(multiplier)) {
      throw new Error(`${label} (${pokemon.name}) : efficacite "${type}" invalide.`);
    }
    defense[type] = multiplier;
  }

  // Objet neuf, champ par champ : aucune propriete source ne fuit ici.
  return {
    id: pokemon.id,
    name: pokemon.name,
    image: pokemon.image,
    types: [...pokemon.types],
    stats,
    effectiveness: { defense },
  };
}

export function buildPublishedPokedex(): PublishedPokemon[] {
  const sources: Array<[string, string]> = [
    ["pokemon-gen1.json", POKEMON_GEN1_DB],
    ["pokemon-gen2.json", POKEMON_GEN2_DB],
    ["pokemon-gen3.json", POKEMON_GEN3_DB],
  ];

  const byId = new Map<number, PublishedPokemon>();
  for (const [label, filePath] of sources) {
    for (const pokemon of readPokedexFile(filePath)) {
      const published = toPublishedPokemon(pokemon, label);
      byId.set(published.id, published);
    }
  }

  return [...byId.values()].sort((a, b) => a.id - b.id);
}

function build(): void {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const file of STATIC_FILES) {
    const source = path.join(SOURCE_DIR, file);
    if (!fs.existsSync(source)) {
      throw new Error(`Fichier source manquant : tools/raid-simulator/src/${file}`);
    }
    fs.copyFileSync(source, path.join(OUTPUT_DIR, file));
  }

  const pokedex = buildPublishedPokedex();
  const pokedexPath = path.join(OUTPUT_DIR, "pokedex.json");
  fs.writeFileSync(pokedexPath, JSON.stringify(pokedex), "utf-8");

  const sizeKb = Math.round(fs.statSync(pokedexPath).size / 1024);
  console.log(`Simulateur de raid construit dans dist-web/raid-simulator/`);
  console.log(`  ${STATIC_FILES.length} fichiers statiques`);
  console.log(`  pokedex.json : ${pokedex.length} Pokémon, ${sizeKb} Ko`);
}

if (require.main === module) {
  try {
    build();
  } catch (error) {
    console.error(`Build du simulateur echoue : ${(error as Error).message}`);
    process.exit(1);
  }
}
