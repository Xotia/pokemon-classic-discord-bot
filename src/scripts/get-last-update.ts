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

function screenCtrlC(): void {
  execSync(`screen -S "${SCREEN_SESSION}" -X stuff $'\\003'`, { shell: "/bin/bash" });
}

function screenRun(cmd: string): void {
  execSync(`screen -S "${SCREEN_SESSION}" -X stuff $'${cmd}\\n'`, { shell: "/bin/bash" });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  // 1. Message de maintenance
  console.log("📢 Envoi du message de maintenance...");
  run("npx ts-node src/scripts/announcements/send-maintenance.ts");

  // 2. Arrêt du bot (Ctrl+C dans le screen)
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
  console.log("\n🚀 Démarrage du bot...");
  screenRun("npm start");

  // 6. Attente puis vérification de la sortie du screen
  console.log(`\n⏳ Attente de ${START_WAIT_MS / 1_000}s pour vérifier le démarrage...`);
  await sleep(START_WAIT_MS);

  try {
    execSync(`screen -S "${SCREEN_SESSION}" -X hardcopy "${HARDCOPY_PATH}"`, {
      shell: "/bin/bash",
    });
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
  run("npx ts-node src/scripts/announcements/send-back-online.ts");

  console.log("\n🎉 Mise à jour terminée !");
}

main().catch((err: Error) => {
  console.error("\n❌ Erreur fatale :", err.message);
  process.exit(1);
});
