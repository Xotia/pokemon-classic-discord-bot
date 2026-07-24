import fs from "fs";
import { playersDb } from "../../config/paths";
import { PlayersRecord } from "../../types/Player";

function parseGuildId(argv: string[]): string {
  const index = argv.indexOf("--guildId");
  const guildId = index !== -1 ? argv[index + 1] : undefined;

  if (!guildId) {
    console.error("Usage: ts-node src/scripts/player-maintenance/init-research-data.ts --guildId <id>");
    process.exit(1);
  }

  return guildId;
}

const guildId = parseGuildId(process.argv.slice(2));
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
  console.error("Erreur :", error);
}
