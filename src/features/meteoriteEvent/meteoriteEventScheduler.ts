import { Client } from "discord.js";
import cron from "node-cron";
import { loadGuildRegistry } from "../../config/guilds";
import { isMeteoriteEventActive, EVENT_END, METEORITE_WARNING_DATE, METEORITE_RAID_SLOTS } from "./meteoriteEventConfig";
import { loadMeteoriteEventState, saveMeteoriteEventState } from "./meteoriteEventState.service";
import { openRaidRegistration, closeRaidAndResolve, sendRaidAnnouncement } from "../raid/raidScheduler";
import { generateMeteoriteRaidState } from "./generateMeteoriteRaidState";
import { buildMeteoriteWarningEmbed, buildMeteoriteStartEmbed, buildMeteoriteEndEmbed } from "./buildMeteoriteLoreEmbeds";
import { getLoggerForGuild } from "../../utils/logger";

export function startMeteoriteEventScheduler(client: Client): void {
  const guilds = loadGuildRegistry();

  for (const guild of guilds) {
    cron.schedule(
      "*/1 * * * *",
      async () => {
        const now = new Date();
        const logger = getLoggerForGuild(guild.guildId);
        const state = await loadMeteoriteEventState(guild.guildId);

        // Alerte J-7 : envoi unique dès que la date est dépassée, avant le jour de l'évènement
        if (!state.warningAnnounced && now >= METEORITE_WARNING_DATE) {
          try {
            const embed = buildMeteoriteWarningEmbed();
            await sendRaidAnnouncement(client, guild.mainChannelId, embed, guild.guildId);
          } catch (error) {
            logger.error({
              event: "meteorite_warning_embed_failed",
              guildId: guild.guildId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          state.warningAnnounced = true;
          await saveMeteoriteEventState(guild.guildId, state);
        }

        if (!isMeteoriteEventActive(now)) return;

        if (!state.zoneOpenedAnnounced) {
          try {
            const embed = buildMeteoriteStartEmbed();
            await sendRaidAnnouncement(client, guild.mainChannelId, embed, guild.guildId);
          } catch (error) {
            logger.error({
              event: "meteorite_start_embed_failed",
              guildId: guild.guildId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          state.zoneOpenedAnnounced = true;
          await saveMeteoriteEventState(guild.guildId, state);
        }

        for (let i = 0; i < METEORITE_RAID_SLOTS.length; i++) {
          const slot = METEORITE_RAID_SLOTS[i];
          const checkpoint = state.checkpointsFired[i] ?? { opened: false, closed: false };

          if (!checkpoint.opened && now >= slot.openTime) {
            logger.info({
              event: "meteorite_raid_opening",
              guildId: guild.guildId,
              slotIndex: i,
              label: slot.label,
            });
            try {
              await openRaidRegistration(
                guild.guildId,
                guild.raidAnnounceChannelId,
                (gId) => generateMeteoriteRaidState(gId, slot.deoxysPokemonId, 5),
              );
            } catch (error) {
              logger.error({
                event: "meteorite_raid_open_failed",
                guildId: guild.guildId,
                slotIndex: i,
                error: error instanceof Error ? error.message : String(error),
              });
            }
            checkpoint.opened = true;
            state.checkpointsFired[i] = checkpoint;
            await saveMeteoriteEventState(guild.guildId, state);
          }

          if (checkpoint.opened && !checkpoint.closed && now >= slot.closeTime) {
            logger.info({
              event: "meteorite_raid_closing",
              guildId: guild.guildId,
              slotIndex: i,
              label: slot.label,
            });
            try {
              await closeRaidAndResolve(guild.guildId, guild.raidAnnounceChannelId);
            } catch (error) {
              logger.error({
                event: "meteorite_raid_close_failed",
                guildId: guild.guildId,
                slotIndex: i,
                error: error instanceof Error ? error.message : String(error),
              });
            }
            checkpoint.closed = true;
            state.checkpointsFired[i] = checkpoint;
            await saveMeteoriteEventState(guild.guildId, state);
          }
        }
      },
      { timezone: "Europe/Paris" },
    );
  }

  // Separate cron for zone closing announcement — runs even after event ends
  for (const guild of guilds) {
    cron.schedule(
      "*/1 * * * *",
      async () => {
        const now = new Date();
        if (now <= EVENT_END) return;

        const state = await loadMeteoriteEventState(guild.guildId);
        if (state.zoneOpenedAnnounced && !state.zoneClosedAnnounced) {
          const logger = getLoggerForGuild(guild.guildId);
          try {
            const embed = buildMeteoriteEndEmbed();
            await sendRaidAnnouncement(client, guild.mainChannelId, embed, guild.guildId);
          } catch (error) {
            logger.error({
              event: "meteorite_end_embed_failed",
              guildId: guild.guildId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          state.zoneClosedAnnounced = true;
          await saveMeteoriteEventState(guild.guildId, state);
        }
      },
      { timezone: "Europe/Paris" },
    );
  }
}
