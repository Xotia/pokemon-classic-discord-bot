import cron from "node-cron";
import { EmbedBuilder, type Client } from "discord.js";
import type { RaidState } from "../../types/raid/RaidState";
import { loadRaidState, saveRaidState, resetRaidState } from "./raidState.service";
import { generateRaidState } from "./raidGenerator.service";
import { buildRaidAnnouncementEmbed } from "./buildRaidAnnouncementEmbed";
import { resolveRaid } from "./resolveRaid";
import { applyRaidRewards } from "./applyRaidRewards";
import { unlockRaidZone } from "./unlockRaidZone";
import { buildRaidResultEmbed } from "./buildRaidResultEmbed";
import { loadGuildRegistry } from "../../config/guilds";
import logger, { getLoggerForGuild } from "../../utils/logger";
import { getRaidSchedulerMode, getRaidStartHour, getRaidEndHour } from "../../config/guildSettings";
import {
  isMeteoriteEventActive,
  matchesMeteoriteZone,
} from "../../features/meteoriteEvent/meteoriteEventConfig";

const RAID_TIMEZONE = "Europe/Paris";

let discordClient: Client | null = null;

/**
 * discordClient n'est normalement rempli que par startRaidScheduler() au démarrage du bot.
 * Un script standalone qui appelle closeRaidAndResolve/openRaidRegistration directement
 * doit d'abord passer par ici, sinon l'envoi de l'embed est silencieusement ignoré.
 */
export function setDiscordClient(client: Client): void {
  discordClient = client;
}

export async function sendRaidAnnouncement(
  client: Client,
  channelId: string,
  embed: EmbedBuilder,
  guildId?: string,
): Promise<void> {
  const scopedLogger = guildId ? getLoggerForGuild(guildId) : logger;

  if (!channelId || channelId.trim().length === 0) {
    throw new Error("[RAID] RAID_ANNOUNCE_CHANNEL_ID manquant.");
  }

  const channel = await client.channels.fetch(channelId).catch((error) => {
    scopedLogger.error({
      message: "[RAID] Impossible de fetch le salon d'annonce",
      channelId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  });

  if (!channel) {
    throw new Error(`[RAID] Salon d'annonce introuvable. channelId=${channelId}`);
  }

  if (!channel.isSendable()) {
    throw new Error(`[RAID] Salon d'annonce invalide pour envoi. channelId=${channelId}, type=${channel.type}`);
  }

  await channel.send({ embeds: [embed] });
}

export async function openRaidRegistration(
  guildId: string,
  announceChannelId: string,
  factory?: (guildId: string) => Promise<RaidState>,
): Promise<void> {
  const logger = getLoggerForGuild(guildId);
  const currentState = await loadRaidState(guildId);

  if (currentState.status === "registration") {
    logger.info(`[RAID] (${guildId}) Un raid est déjà en cours d'inscription, ouverture ignorée.`);
    return;
  }

  logger.info(`[RAID] (${guildId}) Génération d'un nouveau raid...`);
  const newState = factory ? await factory(guildId) : await generateRaidState(guildId);
  await saveRaidState(guildId, newState);

  logger.info({
    event: "raid_opened",
    guildId,
    raidId: newState.raidId,
    generation: newState.generation,
    zone: newState.zone,
    pokemon: newState.raidPokemon?.name,
    difficulty: newState.raidPokemon?.difficulty,
    attackType: newState.raidPokemon?.attackType,
    closeAt: newState.registrationClosesAt,
  });

  if (!discordClient) {
    throw new Error("[RAID] Client Discord indisponible.");
  }

  const embed = await buildRaidAnnouncementEmbed(newState, guildId);
  await sendRaidAnnouncement(discordClient, announceChannelId, embed, guildId);

  logger.info(`[RAID] (${guildId}) Annonce envoyée dans le salon ${announceChannelId}.`);
}

export async function closeRaidAndResolve(guildId: string, announceChannelId: string): Promise<void> {
  const logger = getLoggerForGuild(guildId);
  const currentState = await loadRaidState(guildId);

  if (currentState.status !== "registration") {
    logger.info(`[RAID] (${guildId}) Aucun raid en inscription à résoudre.`);
    return;
  }

  logger.info({
    event: "raid_resolving",
    guildId,
    raidId: currentState.raidId,
    defendersCount: currentState.defenders.length,
    defenderNames: currentState.defenders.map((d) => d.pokemonName),
  });

  const resolvedState = resolveRaid(currentState);

  logger.info({
    event: "raid_resolved",
    guildId,
    raidId: resolvedState.raidId,
    success: resolvedState.result?.success,
    participants: resolvedState.result?.participantsCount,
    missingStats: resolvedState.result?.missingStats,
    teamStats: resolvedState.result?.teamStats,
    statDiffs: resolvedState.result?.statDiffs,
  });

  const reward = await applyRaidRewards(resolvedState, guildId);

  let zoneUnlocked: string | null = null;
  if (reward.raidWin && resolvedState.zone && resolvedState.generation) {
    zoneUnlocked = await unlockRaidZone(guildId, resolvedState.zone, resolvedState.generation);
    if (zoneUnlocked) {
      reward.zoneUnlocked = zoneUnlocked;
      logger.info(`[RAID] (${guildId}) Zone débloquée après victoire: ${zoneUnlocked}`);
    }
  }

  const finalState: RaidState = {
    ...resolvedState,
    status: "reward_pending",
    reward,
  };

  await saveRaidState(guildId, finalState);

  if (discordClient) {
    try {
      const resultEmbed = buildRaidResultEmbed(finalState);
      await sendRaidAnnouncement(discordClient, announceChannelId, resultEmbed, guildId);
      logger.info(`[RAID] (${guildId}) Message de résultat envoyé.`);
    } catch (error) {
      logger.error({
        event: "raid_result_embed_failed",
        guildId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info({
    event: "raid_rewards_applied",
    guildId,
    xp: reward.xp,
    raidWin: reward.raidWin,
    zoneUnlocked: reward.zoneUnlocked,
    capturedByPlayerName: reward.capturedByPlayerName,
  });

  await resetRaidState(guildId);
  logger.info(`[RAID] (${guildId}) État du raid réinitialisé. Cycle terminé.`);
}

export function startRaidScheduler(client: Client): void {
  discordClient = client;

  for (const guild of loadGuildRegistry()) {
    const schedulerMode = getRaidSchedulerMode(guild.guildId);
    const raidStartHour = getRaidStartHour(guild.guildId);
    const raidEndHour = getRaidEndHour(guild.guildId);

    const openExpression =
      schedulerMode === "production" ? raidStartHour : "*/2 * * * *";

    const resolveExpression =
      schedulerMode === "production" ? raidEndHour : "*/3 * * * *";

    cron.schedule(
      openExpression,
      () => {
        if (isMeteoriteEventActive()) return;
        void openRaidRegistration(guild.guildId, guild.raidAnnounceChannelId).catch((error) => {
          getLoggerForGuild(guild.guildId).error({
            event: "raid_open_failed",
            guildId: guild.guildId,
            announceChannelId: guild.raidAnnounceChannelId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
        });
      },
      { timezone: RAID_TIMEZONE },
    );

    cron.schedule(
      resolveExpression,
      () => {
        void (async () => {
          // Les raids météorite ont leurs propres fenêtres de clôture, pilotées
          // par meteoriteEventScheduler. Le cron générique ne doit pas les
          // résoudre en avance (en mode debug il tourne toutes les 3 minutes,
          // et en production raidEndHour peut tomber au milieu d'un créneau).
          const currentState = await loadRaidState(guild.guildId);
          if (currentState.zone && matchesMeteoriteZone(currentState.zone)) {
            getLoggerForGuild(guild.guildId).info(
              `[RAID] (${guild.guildId}) Raid météorite en cours, clôture générique ignorée.`,
            );
            return;
          }

          await closeRaidAndResolve(guild.guildId, guild.raidAnnounceChannelId);
        })().catch((error) => {
          getLoggerForGuild(guild.guildId).error({
            event: "raid_close_failed",
            guildId: guild.guildId,
            announceChannelId: guild.raidAnnounceChannelId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
        });
      },
      { timezone: RAID_TIMEZONE },
    );

    getLoggerForGuild(guild.guildId).info({
      event: "raid_scheduler_started",
      guildId: guild.guildId,
      guildName: guild.name,
      mode: schedulerMode,
      timezone: RAID_TIMEZONE,
      openCron: openExpression,
      resolveCron: resolveExpression,
    });
  }
}
