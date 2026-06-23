import fs from "fs";
import path from "path";

type Player = {
  username: string;
  xp?: number;
  level?: number;
  [key: string]: unknown;
};

type PlayersMap = Record<string, Player>;

const filePath = path.join(__dirname, "../../data/players.json");

try {
  const rawData = fs.readFileSync(filePath, "utf-8");
  const players: PlayersMap = JSON.parse(rawData);

  for (const playerId of Object.keys(players)) {
    players[playerId].xp = players[playerId].xp ?? 0;
    players[playerId].level = players[playerId].level ?? 1;
  }

  fs.writeFileSync(filePath, JSON.stringify(players, null, 2), "utf-8");

  console.log("Le fichier players.json a été mis à jour.");
} catch (error) {
  console.error("Erreur :", error);
}
