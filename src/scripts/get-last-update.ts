import { execSync } from "child_process";
import * as fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const SCREEN_SESSION = process.env.BOT_SCREEN_SESSION;
if (!SCREEN_SESSION) {
  console.error("Erreur : BOT_SCREEN_SESSION requis dans le .env");
  process.exit(1);
}

const HARDCOPY_PATH = "/tmp/pokemon-bot-start-check.txt";
const START_WAIT_MS = 10_000;
const ERROR_PATTERNS = [
  "Error:",
  "error TS",
  "Cannot find module",
  "UnhandledPromiseRejection",
  "ENOENT",
];

function run(cmd: string): void {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function bash(cmd: string): string {
  return execSync(cmd, { shell: "/bin/bash", encoding: "utf-8" });
}

/** Identifiant complet (`pid.nom`) de la session réutilisée pour toute la mise à jour. */
let sessionId: string | null = null;

/** Sessions existantes portant exactement le nom BOT_SCREEN_SESSION, sous la forme `pid.nom`. */
function listSessions(): string[] {
  const output = bash("screen -ls || true");
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\S+\s+\(/.test(line))
    .map((line) => line.split(/\s+/)[0])
    .filter((id) => id.slice(id.indexOf(".") + 1) === SCREEN_SESSION);
}

/**
 * Garantit qu'une seule session porte le nom du bot, et la réutilise.
 * Les sessions mortes sont nettoyées, les homonymes en trop sont fermés,
 * et une session shell n'est créée que s'il n'en reste aucune.
 */
function ensureScreenSession(): void {
  bash("screen -wipe > /dev/null 2>&1 || true");

  let sessions = listSessions();

  if (sessions.length > 1) {
    const [kept, ...duplicates] = sessions;
    console.warn(
      `\n⚠️  ${sessions.length} screens nommés "${SCREEN_SESSION}" détectés — fermeture des ${duplicates.length} doublons.`,
    );
    for (const duplicate of duplicates) {
      bash(`screen -S "${duplicate}" -X quit || true`);
    }
    sessions = [kept];
  }

  if (sessions.length === 0) {
    console.log(`\n🖥️  Aucun screen "${SCREEN_SESSION}" — création.`);
    // Session shell (et non session-commande) : un Ctrl+C arrête le bot sans tuer le screen,
    // ce qui permet de réutiliser la même session à chaque mise à jour.
    bash(`screen -dmS "${SCREEN_SESSION}"`);
    sessions = listSessions();
    if (sessions.length === 0) {
      throw new Error(`Impossible de créer le screen "${SCREEN_SESSION}".`);
    }
    sessionId = sessions[0];
    screenRun(`cd ${JSON.stringify(process.cwd())}`);
    return;
  }

  sessionId = sessions[0];
  console.log(`\n🖥️  Réutilisation du screen ${sessionId}.`);
}

function screenExec(args: string): void {
  if (!sessionId) {
    throw new Error("Session screen non initialisée.");
  }
  execSync(`screen -S "${sessionId}" -X ${args}`, { shell: "/bin/bash" });
}

function screenCtrlC(): void {
  screenExec(`stuff $'\\003'`);
}

function screenRun(cmd: string): void {
  screenExec(`stuff $'${cmd}\\n'`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  // 1. Message de maintenance
  console.log("📢 Envoi du message de maintenance...");
  run("npx ts-node src/scripts/announcements/send-quick-maintenance.ts");

  // 2. Arrêt du bot (Ctrl+C dans le screen réutilisé)
  ensureScreenSession();
  console.log("\n🛑 Arrêt du bot...");
  screenCtrlC();
  await sleep(2_000);

  // 3. git pull
  console.log("\n⬇️  Récupération des mises à jour...");
  run("git pull");

  // 4. Build + déploiement des commandes
  console.log("\n🔨 Build...");
  run("npm run build");
  run("npm run deploy");
  run("npm run deploy:dev:clear");

  // 5. Démarrage du bot dans le screen
  // Re-vérification : si la session a été lancée en session-commande par le passé,
  // le Ctrl+C de l'étape 2 l'a tuée — on la recrée plutôt que d'échouer.
  ensureScreenSession();
  console.log("\n🚀 Démarrage du bot...");
  screenRun("npm start");

  // 6. Attente puis vérification de la sortie du screen
  console.log(`\n⏳ Attente de ${START_WAIT_MS / 1_000}s pour vérifier le démarrage...`);
  await sleep(START_WAIT_MS);

  try {
    screenExec(`hardcopy "${HARDCOPY_PATH}"`);
    const output = fs.readFileSync(HARDCOPY_PATH, "utf-8");
    const hasError = ERROR_PATTERNS.some((pattern) => output.includes(pattern));

    if (hasError) {
      console.error("\n❌ Des erreurs ont été détectées dans la sortie du bot.");
      console.error(`   Vérifiez avec : screen -r ${SCREEN_SESSION}`);
      process.exit(1);
    }
  } catch {
    console.warn("\n⚠️  Impossible de lire la sortie du bot — vérifiez manuellement.");
    console.warn(`   screen -r ${SCREEN_SESSION}`);
  }

  // 7. Message de retour en ligne
  console.log("\n✅ Bot démarré. Envoi du message de retour en ligne...");
  run("npx ts-node src/scripts/announcements/send-quick-back-online.ts");

  console.log("\n🎉 Mise à jour terminée !");
}

main().catch((err: Error) => {
  console.error("\n❌ Erreur fatale :", err.message);
  process.exit(1);
});
