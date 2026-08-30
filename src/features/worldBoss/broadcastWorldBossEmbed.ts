import type { Client, EmbedBuilder } from 'discord.js';
import { loadGuildRegistry } from '../../config/guilds';
import logger from '../../utils/logger';

export type BroadcastResult = {
  sent: number;
  failed: number;
  failures: { guildId: string; channelId: string; error: string }[];
};

/**
 * Diffuse un embed dans le salon de raid de CHAQUE serveur du registre.
 *
 * L'échec d'un serveur (salon supprimé, permissions retirées) est journalisé et
 * n'interrompt jamais les autres envois ni la résolution en cours : la fonction
 * ne rejette pas, elle rend le compte des succès et des échecs.
 */
export async function broadcastWorldBossEmbed(
  client: Client,
  embed: EmbedBuilder,
): Promise<BroadcastResult> {
  const result: BroadcastResult = { sent: 0, failed: 0, failures: [] };

  let registry;
  try {
    registry = loadGuildRegistry();
  } catch (error) {
    logger.error(
      {
        event: 'world_boss_announce_failed',
        error: error instanceof Error ? error.message : String(error),
      },
      '[WORLD BOSS] Registre des serveurs illisible, aucune diffusion',
    );
    return result;
  }

  for (const entry of registry) {
    const channelId = entry.raidAnnounceChannelId;

    try {
      if (!channelId || channelId.trim().length === 0) {
        throw new Error('raidAnnounceChannelId manquant');
      }

      const channel = await client.channels.fetch(channelId);

      if (!channel) throw new Error(`salon introuvable (${channelId})`);
      if (!channel.isSendable()) throw new Error(`salon non inscriptible (${channelId})`);

      await channel.send({ embeds: [embed] });
      result.sent++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.failed++;
      result.failures.push({ guildId: entry.guildId, channelId: channelId ?? '', error: message });

      logger.error(
        {
          event: 'world_boss_announce_failed',
          guildId: entry.guildId,
          channelId,
          error: message,
        },
        '[WORLD BOSS] Diffusion impossible sur ce serveur, les autres continuent',
      );
    }
  }

  logger.info(
    { event: 'world_boss_announced', sent: result.sent, failed: result.failed },
    '[WORLD BOSS] Diffusion terminée',
  );

  return result;
}
