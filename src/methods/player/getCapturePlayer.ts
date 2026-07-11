import { getPlayer } from "../../utils/loadPlayer";
import { getLoggerForGuild } from "../../utils/logger";
import { createProfileIfNeeded } from "./createProfileIfNeeded";

export function getCapturePlayer(interaction: any, guildId: string) {
  const logger = getLoggerForGuild(guildId);
  const userName =
    interaction.user.globalName ||
    interaction.user.username ||
    interaction.user.displayName ||
    interaction.user.tag;

  createProfileIfNeeded(interaction, guildId);
  logger.info(`Le joueur ${userName} exécute /capture.`);

  const player = getPlayer(guildId, interaction.user.id);

  if (!player) {
    logger.info(`Joueur avec l'ID ${interaction.user.id} non trouvé.`);
    return null;
  }

  return player;
}
