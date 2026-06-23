import { getPlayer } from "../../utils/loadPlayer";
import logger from "../../utils/logger";
import { createProfileIfNeeded } from "./createProfileIfNeeded";

export function getCapturePlayer(interaction: any) {
  const userName =
    interaction.user.globalName ||
    interaction.user.username ||
    interaction.user.displayName ||
    interaction.user.tag;

  createProfileIfNeeded(interaction);
  logger.info(`Le joueur ${userName} exécute /capture.`);

  const player = getPlayer(interaction.user.id);

  if (!player) {
    logger.info(`Joueur avec l'ID ${interaction.user.id} non trouvé.`);
    return null;
  }

  return player;
}
