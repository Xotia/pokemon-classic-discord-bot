const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = { guildId: null, source: null };

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--guildId") {
      args.guildId = argv[i + 1];
      i++;
    } else if (argv[i] === "--source") {
      args.source = argv[i + 1];
      i++;
    }
  }

  return args;
}

const { guildId, source } = parseArgs(process.argv.slice(2));

if (!guildId) {
  console.error("Usage: node scripts/migrate-to-guild-dirs.js --guildId <id> [--source <dossier>]");
  process.exit(1);
}

const sourceDir = source ? path.resolve(source) : path.resolve(__dirname, "..", "data");
const targetDir = path.resolve(__dirname, "..", "data", "guilds", guildId);

const files = ["players.json", "stats.json", "zones_unlocked.json", "zones_to_unlock.json", "raid.json"];

fs.mkdirSync(targetDir, { recursive: true });

function summarize(filePath) {
  if (!fs.existsSync(filePath)) return null;

  try {
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (Array.isArray(content)) return { count: content.length };
    if (content && typeof content === "object") return { keys: Object.keys(content).length };
    return {};
  } catch {
    return { parseError: true };
  }
}

for (const file of files) {
  const src = path.join(sourceDir, file);
  const dest = path.join(targetDir, file);

  if (!fs.existsSync(src)) {
    console.log(`[migrate] ${file} absent de la source, ignoré`);
    continue;
  }

  const before = summarize(src);
  fs.copyFileSync(src, dest);
  const after = summarize(dest);

  console.log(`[migrate] ${file}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
}

console.log(`[migrate] Terminé. Vérifie ${targetDir} avant de supprimer les fichiers originaux dans ${sourceDir}.`);
