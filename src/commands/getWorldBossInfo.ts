import { ChatInputCommandInteraction } from 'discord.js';
import { buildWorldBossTeamEmbed } from '../features/worldBoss/buildWorldBossTeamEmbed';
import { loadWorldBossState } from '../features/worldBoss/worldBossState.service';

/**
 * Affiche l'équipe mondiale complète, identique sur tous les serveurs : l'état
 * est global, et l'embed s'appuie sur les `displayName` figés à l'inscription
 * plutôt que sur les membres du serveur courant.
 */
export async function getWorldBossInfo(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply();
  } catch {
    return;
  }

  if (!interaction.guildId) {
    await interaction.editReply("Cette commande n'est disponible que sur un serveur.");
    return;
  }

  const state = await loadWorldBossState();

  await interaction.editReply({ embeds: [buildWorldBossTeamEmbed(state)] });
}
