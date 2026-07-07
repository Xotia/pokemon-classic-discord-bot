import fs from "fs";
import { playersDb } from "../../config/paths";
import { Player } from "../../types/Player";
import logger from "../../utils/logger";

export async function savePlayerDataById(guildId: string, playerId: string, playerData: Player) {
  try {
    const allPlayers: Record<string, Player> =
      JSON.parse(fs.readFileSync(playersDb(guildId), "utf8")) || {};

    allPlayers[playerId] = playerData;

    fs.writeFileSync(playersDb(guildId), JSON.stringify(allPlayers, null, 2), "utf-8");
    logger.info(`✅ Profil ${playerData.name} sauvegardé pour l'id ${playerId}`);
  } catch (error) {
    logger.info(`❌ Erreur sauvegarde: ${error}`);
    console.error("❌ Erreur sauvegarde:", error);
  }
}