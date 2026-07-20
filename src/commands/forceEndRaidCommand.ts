import { getGuildConfig } from "../config/guilds";
import { closeRaidAndResolve } from "../features/raid/raidScheduler";
import { loadRaidState } from "../features/raid/raidState.service";
import { getLoggerForGuild } from "../utils/logger";

export async function forceEndRaidCommand(interaction: any) {
  const callerName = interaction.user.globalName || interaction.user.username;

  const guildId = interaction.guildId;
  if (!guildId) {
    return interaction.reply("Cette commande n'est disponible que sur un serveur.");
  }

  const logger = getLoggerForGuild(guildId);

  const OWNER_ID = process.env.ADMIN_ID;
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply(`Non ${callerName} tu ne forceras pas la clôture du raid ici.`);
  }

  const guildConfig = getGuildConfig(guildId);
  if (!guildConfig) {
    return interaction.reply("❌ Configuration du serveur introuvable pour le salon d'annonce des raids.");
  }

  await interaction.deferReply();

  const currentState = await loadRaidState(guildId);
  if (currentState.status !== "registration") {
    await interaction.editReply("Aucun raid en cours d'inscription à clôturer.");
    return;
  }

  logger.info(`🛠️ Clôture forcée du raid par ${callerName} (raidId=${currentState.raidId}).`);

  try {
    await closeRaidAndResolve(guildId, guildConfig.raidAnnounceChannelId);
    await interaction.editReply("✅ Raid clôturé et résolu. Le résultat a été annoncé dans le salon dédié.");
  } catch (error) {
    logger.error({
      message: "[RAID] Échec de la clôture forcée du raid",
      guildId,
      error: error instanceof Error ? error.message : String(error),
    });
    await interaction.editReply("❌ Une erreur est survenue lors de la clôture du raid.");
  }
}
