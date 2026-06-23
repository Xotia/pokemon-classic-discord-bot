import fs from "fs";
import { PLAYERS_DB } from "../../config/paths";
import { Player } from "../../types/Player";
import logger from "../../utils/logger";

export async function savePlayerDataById(playerId: string, playerData: Player) {
  try {
    const allPlayers: Record<string, Player> =
      JSON.parse(fs.readFileSync(PLAYERS_DB, "utf8")) || {};

    allPlayers[playerId] = playerData;

    fs.writeFileSync(PLAYERS_DB, JSON.stringify(allPlayers, null, 2), "utf-8");
    logger.info(`✅ Profil ${playerData.name} sauvegardé pour l'id ${playerId}`);
  } catch (error) {
    logger.info(`❌ Erreur sauvegarde: ${error}`);
    console.error("❌ Erreur sauvegarde:", error);
  }
}