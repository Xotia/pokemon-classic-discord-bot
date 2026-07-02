const fs = require("fs");
const path = require("path");

const dataDir = path.resolve(__dirname, "..", "data");

const files = ["zones_to_unlock.json", "zones_unlocked.json"];

for (const file of files) {
  const target = path.join(dataDir, file);
  const defaultFile = path.join(dataDir, file.replace(".json", ".default.json"));

  if (!fs.existsSync(target)) {
    fs.copyFileSync(defaultFile, target);
    console.log(`[init-data] Created ${file} from default`);
  } else {
    console.log(`[init-data] ${file} already exists, skipping`);
  }
}

const emptyJsonFiles = {
  "players.json": {},
  "stats.json": { totalCaptures: 0, totalShinyCaptures: 0, playerTotals: {}, pokemonsTotals: {}, rarity: {} },
};

for (const [file, defaultContent] of Object.entries(emptyJsonFiles)) {
  const target = path.join(dataDir, file);

  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, JSON.stringify(defaultContent, null, 2));
    console.log(`[init-data] Created ${file} (empty)`);
  } else {
    console.log(`[init-data] ${file} already exists, skipping`);
  }
}
