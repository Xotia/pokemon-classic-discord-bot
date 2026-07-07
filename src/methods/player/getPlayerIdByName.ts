import fs from "fs";
import { playersDb } from "../../config/paths";

export function getPlayerIdByName(guildId: string, name: string): string | null {
  try {
    const allPlayers = JSON.parse(fs.readFileSync(playersDb(guildId), "utf8"));

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