/**
 * Compare le `.env` local à `.env.example` et ajoute les variables manquantes.
 *
 * Appelé par get-last-update.ts EN PRÉ-VOL, avant l'arrêt du bot : le
 * `.env.example` de référence est celui de la branche distante (git fetch +
 * git show), pas celui du disque, sinon la vérification arriverait après le
 * pull, donc après l'arrêt du bot, et une abandon laisserait la prod éteinte.
 *
 * Objectif : une mise à jour qui introduit une nouvelle variable ne doit pas
 * démarrer le bot avec une valeur implicite non voulue (le cas
 * WORLD_BOSS_SCHEDULER_MODE, dont le défaut code est `debug`).
 *
 * Règles :
 * - une clé déjà présente dans .env n'est JAMAIS modifiée, même vide ;
 * - une clé commentée dans .env.example (ex. METEORITE_EVENT_DEBUG) est
 *   considérée comme optionnelle et n'est pas ajoutée ;
 * - les ajouts sortent en code 10 : la valeur vient de .env.example, elle est
 *   pensée pour le dev, donc l'humain relit avant de relancer la prod.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const ENV_PATH = path.join(process.cwd(), ".env");
const EXAMPLE_PATH = path.join(process.cwd(), ".env.example");

/** Code de sortie signalant « des clés ont été ajoutées, relis le .env ». */
export const EXIT_KEYS_ADDED = 10;

const KEY_LINE = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;

/** Clés déclarées (non commentées) d'un fichier .env, dans l'ordre du fichier. */
export function parseEnvKeys(content: string): Map<string, string> {
  const entries = new Map<string, string>();

  for (const rawLine of content.split(/\r?\n/)) {
    const match = KEY_LINE.exec(rawLine.trim());
    if (match) {
      entries.set(match[1], match[2]);
    }
  }

  return entries;
}

export function findMissingKeys(
  envContent: string,
  exampleContent: string,
): Array<{ key: string; value: string }> {
  const existing = parseEnvKeys(envContent);

  return [...parseEnvKeys(exampleContent)]
    .filter(([key]) => !existing.has(key))
    .map(([key, value]) => ({ key, value }));
}

export function appendMissingKeys(
  envContent: string,
  missing: Array<{ key: string; value: string }>,
): string {
  const separator = envContent.length === 0 || envContent.endsWith("\n") ? "" : "\n";
  const block = missing.map(({ key, value }) => `${key}=${value}`).join("\n");

  return `${envContent}${separator}\n# Ajouté automatiquement par sync-env (valeurs par défaut de .env.example)\n${block}\n`;
}

/**
 * `.env.example` de la branche distante, pour voir les nouvelles variables
 * AVANT le pull. Toute erreur git (pas de remote, pas de réseau, fichier absent
 * en amont) retombe sur la copie locale : le pré-vol ne doit pas bloquer une
 * mise à jour parce que le remote est injoignable.
 */
function readReferenceExample(): string {
  try {
    // stderr coupé : une branche sans remote est un cas normal (repli local),
    // pas un incident à afficher pendant une mise à jour.
    const quiet = { encoding: "utf-8" as const, stdio: ["ignore", "pipe", "ignore"] as ("ignore" | "pipe")[] };
    const branch = execSync("git rev-parse --abbrev-ref HEAD", quiet).trim();
    execSync("git fetch --quiet", { stdio: "ignore" });
    return execSync(`git show origin/${branch}:.env.example`, quiet);
  } catch {
    console.log("ℹ️  .env.example distant illisible, comparaison sur la copie locale.");
    return fs.readFileSync(EXAMPLE_PATH, "utf-8");
  }
}

function main(): void {
  if (!fs.existsSync(EXAMPLE_PATH)) {
    console.error("❌ .env.example introuvable, sync impossible.");
    process.exit(1);
  }

  if (!fs.existsSync(ENV_PATH)) {
    console.error("❌ .env introuvable — un environnement configuré est attendu ici.");
    process.exit(1);
  }

  const envContent = fs.readFileSync(ENV_PATH, "utf-8");
  const exampleContent = readReferenceExample();
  const missing = findMissingKeys(envContent, exampleContent);

  if (missing.length === 0) {
    console.log("✅ .env à jour, aucune variable manquante.");
    return;
  }

  fs.writeFileSync(ENV_PATH, appendMissingKeys(envContent, missing), "utf-8");

  console.log(`\n⚠️  ${missing.length} variable(s) ajoutée(s) au .env :`);
  for (const { key, value } of missing) {
    console.log(`   ${key}=${value}`);
  }
  console.log(
    "\nCes valeurs viennent de .env.example et ne sont pas forcément les bonnes en prod.",
  );
  console.log("Relis le .env, corrige si besoin, puis relance la mise à jour.\n");

  process.exit(EXIT_KEYS_ADDED);
}

if (require.main === module) {
  main();
}
