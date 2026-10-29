import fs from "fs";
import { playersDb } from "../../config/paths";
import { getLoggerForGuild } from "../../utils/logger";
import { Player } from "../../types/Player";

/**
 * `targetUser` : joueur dont on crée le profil quand ce n'est pas l'auteur de
 * l'interaction (commandes admin). Absent : l'auteur de l'interaction.
 */
export function createProfileIfNeeded(
  interaction: any,
  guildId: string,
  targetUser?: { id: string; globalName?: string | null; username: string },
) {
  const logger = getLoggerForGuild(guildId);
  if (!interaction || !interaction.user) {
    logger.info(`❌ Interaction ou interaction.user manquant !`);
    console.error("❌ Interaction ou interaction.user manquant !", interaction);
    throw new Error("Interaction invalide");
  }
  const user = targetUser ?? interaction.user;
  const userId = user.id;
  const userName = user.globalName || user.username;
  const playerData = JSON.parse(fs.readFileSync(playersDb(guildId), "utf-8")) as Record<
    string,
    Player
  >;
  if (!playerData[userId]) {
    logger.info(
      `Création d'un nouveau profil pour le joueur ${userName} (ID: ${userId}).`,
    );
    playerData[userId] = {
      name: userName,
      captureList: {},
      pityCounter: 0,
      xp: 0,
      level: 1,
      researchData: 0,
      worldBossWins: 0,
    };
    fs.writeFileSync(playersDb(guildId), JSON.stringify(playerData, null, 2), "utf-8");
  } else {
    logger.info(
      `Le profil pour le joueur ${userName} (ID: ${userId}) existe déjà.`,
    );
  }
}
