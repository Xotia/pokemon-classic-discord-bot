import { createProfileIfNeeded } from "../methods/player/createProfileIfNeeded";
import { getPlayer } from "../utils/loadPlayer";
import { getLoggerForGuild } from "../utils/logger";
import { computeZoneCompletion } from "../methods/zones/computeZoneCompletion";
import { resolveRequestedZone } from "../methods/zones/resolveRequestedZone";
import { buildZoneCompletionEmbed } from "../methods/embed/buildZoneCompletionEmbed";

export async function zoneCompletionCommand(interaction: any) {
  await interaction.deferReply();

  const guildId = interaction.guildId;
  if (!guildId) {
    return interaction.editReply("Cette commande n'est disponible que sur un serveur.");
  }

  createProfileIfNeeded(interaction, guildId);
  const logger = getLoggerForGuild(guildId);

  const rawZone = interaction.options.getString("zone") ?? "";
  const resolved = resolveRequestedZone(guildId, rawZone);

  if (resolved.status === "unknown") {
    return interaction.editReply(
      `Aucune zone ne correspond à « ${rawZone} ». Utilise l'autocomplétion pour choisir une zone.`,
    );
  }

  if (resolved.status === "locked") {
    return interaction.editReply(
      `**${resolved.zone.label}** n'est pas encore débloquée sur ce serveur.`,
    );
  }

  const player = getPlayer(guildId, interaction.user.id);
  const completion = computeZoneCompletion(guildId, player, resolved.zone.id);

  if (completion.total === 0) {
    return interaction.editReply(
      `Aucun Pokémon n'est recensé dans **${resolved.zone.label}** pour le moment.`,
    );
  }

  const trainerName =
    player?.name || interaction.user.globalName || interaction.user.username;

  logger.info(
    `📊 /zone-progression ${resolved.zone.id} pour ${trainerName} : ${completion.captured}/${completion.total} (${completion.percentage} %)`,
  );

  return interaction.editReply({
    embeds: [buildZoneCompletionEmbed(trainerName, resolved.zone, completion)],
  });
}
