import { Client, EmbedBuilder } from "discord.js";
import cron from "node-cron";
import { loadGuildRegistry } from "../../config/guilds";
import {
  EVENT_END,
  EVENT_START,
  HALLOWEEN_WARNING_DATE,
  isHalloweenEventActive,
} from "./halloweenEventConfig";
import { loadHalloweenEventState, saveHalloweenEventState } from "./halloweenEventState.service";
import { sendRaidAnnouncement } from "../raid/raidScheduler";
import {
  buildHalloweenWarningEmbed,
  buildHalloweenStartEmbed,
  buildHalloweenEndEmbed,
} from "./buildHalloweenLoreEmbeds";
import { getLoggerForGuild } from "../../utils/logger";

interface HalloweenGuild {
  guildId: string;
  mainChannelId: string;
}

/**
 * Un tick du scheduler pour un serveur. Chaque étape n'est marquée faite
 * qu'en cas de succès : un échec est retenté à la minute suivante, et un bot
 * arrêté rattrape l'étape manquée (condition « date dépassée et pas encore
 * faite »).
 */
export async function runHalloweenEventTick(
  client: Client,
  guild: HalloweenGuild,
  now = new Date(),
): Promise<void> {
  const logger = getLoggerForGuild(guild.guildId);

  // Le scheduler démarre avant client.login() : un tick pendant la connexion
  // ne peut pas envoyer d'embed. On réessaiera à la minute suivante.
  if (!client.isReady()) {
    logger.info({ event: "halloween_tick_skipped_client_not_ready", guildId: guild.guildId });
    return;
  }

  const state = await loadHalloweenEventState(guild.guildId);

  const announce = async (
    flag: "warningAnnounced" | "zoneOpenedAnnounced" | "endAnnounced",
    failureEvent: string,
    embed: EmbedBuilder,
  ) => {
    try {
      await sendRaidAnnouncement(client, guild.mainChannelId, embed, guild.guildId);
      state[flag] = true;
      await saveHalloweenEventState(guild.guildId, state);
    } catch (error) {
      logger.error({
        event: failureEvent,
        guildId: guild.guildId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  if (!state.warningAnnounced && now >= HALLOWEEN_WARNING_DATE && now < EVENT_START) {
    await announce("warningAnnounced", "halloween_warning_embed_failed", buildHalloweenWarningEmbed());
  }

  if (!state.zoneOpenedAnnounced && isHalloweenEventActive(now)) {
    await announce("zoneOpenedAnnounced", "halloween_start_embed_failed", buildHalloweenStartEmbed());
  }

  if (state.zoneOpenedAnnounced && !state.endAnnounced && now > EVENT_END) {
    await announce("endAnnounced", "halloween_end_embed_failed", buildHalloweenEndEmbed());
  }
}

export function startHalloweenEventScheduler(client: Client): void {
  for (const guild of loadGuildRegistry()) {
    cron.schedule("*/1 * * * *", () => runHalloweenEventTick(client, guild), {
      timezone: "Europe/Paris",
    });
  }
}
