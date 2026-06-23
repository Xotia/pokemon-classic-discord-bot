import fs from "fs";
import { PLAYERS_DB } from "../../config/paths";

export function getPlayerIdByName(name: string): string | null {
  try {
    const allPlayers = JSON.parse(fs.readFileSync(PLAYERS_DB, "utf8"));

    const normalizedName = name.trim().toLowerCase();

    for (const [playerId, player] of Object.entries(allPlayers) as [string, any][]) {
      if (player?.name?.trim().toLowerCase() === normalizedName) {
        return playerId;
      }
    }

    return null;
  } catch (error) {
    console.error("Erreur recherche joueur par nom:", error);
    return null;
  }
}