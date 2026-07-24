import fs from "fs";
import path from "path";
import { playersDb, GUILDS_ROOT } from "../../config/paths";
import { PlayersRecord } from "../../types/Player";

function parseArgs(argv: string[]): { guildIds: string[] } {
  if (argv.includes("--all")) {
    const guildIds = fs.readdirSync(GUILDS_ROOT).filter((entry) =>
      fs.statSync(path.join(GUILDS_ROOT, entry)).isDirectory()
    );
    return { guildIds };
  }

  const index = argv.indexOf("--guildId");
  const guildId = index !== -1 ? argv[index + 1] : undefined;

  if (!guildId) {
    console.error("Usage: ts-node src/scripts/player-maintenance/init-research-data.ts --guildId <id>");
    console.error("       ts-node src/scripts/player-maintenance/init-research-data.ts --all");
    process.exit(1);
  }

  return { guildIds: [guildId] };
}

const { guildIds } = parseArgs(process.argv.slice(2));

for (const guildId of guildIds) {
  const filePath = playersDb(guildId);

  try {
    const rawData = fs.readFileSync(filePath, "utf-8");
    const players: PlayersRecord = JSON.parse(rawData);

    for (const playerId of Object.keys(players)) {
      players[playerId].researchData = players[playerId].researchData ?? players[playerId].xp ?? 0;
    }

    fs.writeFileSync(filePath, JSON.stringify(players, null, 2), "utf-8");

    console.log(`players.json mis à jour pour guildId=${guildId}.`);
  } catch (error) {
    console.error(`Erreur pour guildId=${guildId} :`, error);
  }
}
