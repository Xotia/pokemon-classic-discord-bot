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
import logger from "../../utils/logger";

const RAID_TIMEZONE = "Europe/Paris";
const RAID_SCHEDULER_MODE = process.env.RAID_SCHEDULER_MODE ?? "debug";
const RAID_ANNOUNCE_CHANNEL_ID = process.env.RAID_ANNOUNCE_CHANNEL_ID;

let discordClient: Client | null = null;

export async function sendRaidAnnouncement(
  client: Client,
  channelId: string,
  embed: EmbedBuilder,
): Promise<void> {
  if (!channelId || channelId.trim().length === 0) {
    throw new Error("[RAID] RAID_ANNOUNCE_CHANNEL_ID manquant.");
  }

  const channel = await client.channels.fetch(channelId).catch((error) => {
    logger.error({
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

export async function openRaidRegistration(): Promise<void> {
  const currentState = await loadRaidState();

  if (currentState.status === "registration") {
    logger.info("[RAID] Un raid est déjà en cours d'inscription, ouverture ignorée.");
    return;
  }

  logger.info("[RAID] Génération d'un nouveau raid...");
  const newState = await generateRaidState();
  await saveRaidState(newState);

  logger.info({
    event: "raid_opened",
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

  const channelID = process.env.RAID_ANNOUNCE_CHANNEL_ID;
  if (!channelID) {
    throw new Error("[RAID] RAID_ANNOUNCE_CHANNEL_ID manquant.");
  }

  const embed = await buildRaidAnnouncementEmbed(newState);
  await sendRaidAnnouncement(discordClient, channelID, embed);

  logger.info(`[RAID] Annonce envoyée dans le salon ${channelID}.`);
}

export async function closeRaidAndResolve(): Promise<void> {
  const currentState = await loadRaidState();

  if (currentState.status !== "registration") {
    logger.info("[RAID] Aucun raid en inscription à résoudre.");
    return;
  }

  logger.info({
    event: "raid_resolving",
    raidId: currentState.raidId,
    defendersCount: currentState.defenders.length,
    defenderNames: currentState.defenders.map((d) => d.pokemonName),
  });

  const resolvedState = resolveRaid(currentState);

  logger.info({
    event: "raid_resolved",
    raidId: resolvedState.raidId,
    success: resolvedState.result?.success,
    participants: resolvedState.result?.participantsCount,
    missingStats: resolvedState.result?.missingStats,
    teamStats: resolvedState.result?.teamStats,
    statDiffs: resolvedState.result?.statDiffs,
  });

  const reward = await applyRaidRewards(resolvedState);

  let zoneUnlocked: string | null = null;
  if (reward.raidWin && resolvedState.zone && resolvedState.generation) {
    zoneUnlocked = await unlockRaidZone(resolvedState.zone, resolvedState.generation);
    if (zoneUnlocked) {
      reward.zoneUnlocked = zoneUnlocked;
      logger.info(`[RAID] Zone débloquée après victoire: ${zoneUnlocked}`);
    }
  }

  const finalState: RaidState = {
    ...resolvedState,
    status: "reward_pending",
    reward,
  };

  await saveRaidState(finalState);

  if (discordClient && RAID_ANNOUNCE_CHANNEL_ID) {
    try {
      const resultEmbed = buildRaidResultEmbed(finalState);
      await sendRaidAnnouncement(discordClient, RAID_ANNOUNCE_CHANNEL_ID, resultEmbed);
      logger.info("[RAID] Message de résultat envoyé.");
    } catch (error) {
      logger.error({
        event: "raid_result_embed_failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info({
    event: "raid_rewards_applied",
    xp: reward.xp,
    raidWin: reward.raidWin,
    zoneUnlocked: reward.zoneUnlocked,
    capturedByPlayerName: reward.capturedByPlayerName,
  });

  await resetRaidState();
  logger.info("[RAID] État du raid réinitialisé. Cycle terminé.");
}

export function startRaidScheduler(client: Client): void {
  discordClient = client;
  const raidStartHour = process.env.RAID_START_HOUR || "00 12 * * *";
  const raidEndHour = process.env.RAID_END_HOUR || "00 20 * * *";

  const openExpression =
    RAID_SCHEDULER_MODE === "production" ? raidStartHour : "*/2 * * * *";

  const resolveExpression =
    RAID_SCHEDULER_MODE === "production" ? raidEndHour : "*/3 * * * *";

  cron.schedule(
    openExpression,
    () => {
      void openRaidRegistration();
    },
    { timezone: RAID_TIMEZONE },
  );

  cron.schedule(
    resolveExpression,
    () => {
      void closeRaidAndResolve();
    },
    { timezone: RAID_TIMEZONE },
  );

  logger.info({
    event: "raid_scheduler_started",
    mode: RAID_SCHEDULER_MODE,
    timezone: RAID_TIMEZONE,
    openCron: openExpression,
    resolveCron: resolveExpression,
  });
}
