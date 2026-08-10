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

        // startMeteoriteEventScheduler est appelé avant client.login() : sans ce
        // garde-fou, un tick tombant pendant la connexion échouerait à envoyer
        // ses embeds. Les étapes ne sont marquées faites qu'en cas de succès,
        // donc on réessaiera simplement à la minute suivante.
        if (!client.isReady()) {
          logger.info({
            event: "meteorite_tick_skipped_client_not_ready",
            guildId: guild.guildId,
          });
          return;
        }

        const state = await loadMeteoriteEventState(guild.guildId);

        // Alerte J-7 : envoi unique dès que la date est dépassée, avant le jour de l'évènement
        if (!state.warningAnnounced && now >= METEORITE_WARNING_DATE) {
          try {
            const embed = buildMeteoriteWarningEmbed();
            await sendRaidAnnouncement(client, guild.mainChannelId, embed, guild.guildId);
            state.warningAnnounced = true;
            await saveMeteoriteEventState(guild.guildId, state);
          } catch (error) {
            logger.error({
              event: "meteorite_warning_embed_failed",
              guildId: guild.guildId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        if (!isMeteoriteEventActive(now)) return;

        if (!state.zoneOpenedAnnounced) {
          try {
            const embed = buildMeteoriteStartEmbed();
            await sendRaidAnnouncement(client, guild.mainChannelId, embed, guild.guildId);
            state.zoneOpenedAnnounced = true;
            await saveMeteoriteEventState(guild.guildId, state);
          } catch (error) {
            logger.error({
              event: "meteorite_start_embed_failed",
              guildId: guild.guildId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        for (let i = 0; i < METEORITE_RAID_SLOTS.length; i++) {
          const slot = METEORITE_RAID_SLOTS[i];
          const checkpoint = state.checkpointsFired[i] ?? { opened: false, closed: false };

          // Créneau jamais ouvert dont la fenêtre est déjà passée (bot arrêté,
          // ou échecs répétés) : on l'abandonne plutôt que d'ouvrir un raid des
          // heures en retard, potentiellement par-dessus le créneau suivant.
          if (!checkpoint.opened && now >= slot.closeTime) {
            logger.error({
              event: "meteorite_raid_slot_missed",
              guildId: guild.guildId,
              slotIndex: i,
              label: slot.label,
              openTime: slot.openTime.toISOString(),
              closeTime: slot.closeTime.toISOString(),
            });
            state.checkpointsFired[i] = { opened: true, closed: true };
            await saveMeteoriteEventState(guild.guildId, state);
            continue;
          }

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
                (gId) => generateMeteoriteRaidState(gId, slot.deoxysPokemonId, 5, slot.closeTime),
              );
              checkpoint.opened = true;
              state.checkpointsFired[i] = checkpoint;
              await saveMeteoriteEventState(guild.guildId, state);
            } catch (error) {
              // Non marqué ouvert : nouvelle tentative au tick suivant, tant que
              // la fenêtre du créneau n'est pas écoulée.
              logger.error({
                event: "meteorite_raid_open_failed",
                guildId: guild.guildId,
                slotIndex: i,
                error: error instanceof Error ? error.message : String(error),
              });
            }
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
              checkpoint.closed = true;
              state.checkpointsFired[i] = checkpoint;
              await saveMeteoriteEventState(guild.guildId, state);
            } catch (error) {
              // Non marqué clos : le raid reste en inscription et la résolution
              // sera retentée au tick suivant.
              logger.error({
                event: "meteorite_raid_close_failed",
                guildId: guild.guildId,
                slotIndex: i,
                error: error instanceof Error ? error.message : String(error),
              });
            }
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
        if (now <= EVENT_END || !client.isReady()) return;

        const state = await loadMeteoriteEventState(guild.guildId);
        if (state.zoneOpenedAnnounced && !state.zoneClosedAnnounced) {
          const logger = getLoggerForGuild(guild.guildId);
          try {
            const embed = buildMeteoriteEndEmbed();
            await sendRaidAnnouncement(client, guild.mainChannelId, embed, guild.guildId);
            state.zoneClosedAnnounced = true;
            await saveMeteoriteEventState(guild.guildId, state);
          } catch (error) {
            logger.error({
              event: "meteorite_end_embed_failed",
              guildId: guild.guildId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      },
      { timezone: "Europe/Paris" },
    );
  }
}
