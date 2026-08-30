import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import logger from "../utils/logger";
import { closeWorldBossAndResolve } from "../features/worldBoss/worldBossScheduler";
import { loadWorldBossState } from "../features/worldBoss/worldBossState.service";

export async function forceEndWorldBossCommand(interaction: ChatInputCommandInteraction) {
  const callerName = interaction.user.globalName || interaction.user.username;

  if (!interaction.guildId) {
    return interaction.reply("Cette commande n'est disponible que sur un serveur.");
  }

  if (interaction.user.id !== process.env.ADMIN_ID) {
    return interaction.reply({
      content: `Non ${callerName}, tu ne refermeras pas ce portail ici.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const currentState = await loadWorldBossState();
  if (currentState.status !== "registration") {
    await interaction.editReply("Aucun world boss n'est ouvert aux inscriptions.");
    return;
  }

  logger.info(
    {
      event: "world_boss_force_end_requested",
      requestedBy: callerName,
      worldBossId: currentState.worldBossId,
      defendersCount: currentState.defenders.length,
    },
    "🛠️ Clôture forcée du world boss",
  );

  try {
    const finalState = await closeWorldBossAndResolve(interaction.client);

    if (!finalState) {
      await interaction.editReply("Aucun world boss n'était ouvert aux inscriptions.");
      return;
    }

    const result = finalState.result;
    await interaction.editReply(
      result?.success
        ? `✅ **${finalState.boss?.name}** a été vaincu par ${result.participantsCount} défenseur(s) de ${result.guildsCount} serveur(s). Le portail est scellé.`
        : `✅ World boss clôturé : **${finalState.boss?.name}** l'emporte (${result?.participantsCount ?? 0} défenseur(s)). Le portail reste ouvert.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error(
      { event: "world_boss_force_end_failed", error: message },
      "[WORLD BOSS] Échec de la clôture forcée",
    );

    await interaction.editReply(`❌ Une erreur est survenue lors de la clôture : ${message}`);
  }
}
