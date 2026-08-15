import { getGuildConfig } from "../config/guilds";
import { openRaidRegistration } from "../features/raid/raidScheduler";
import { generateRaidState } from "../features/raid/raidGenerator.service";
import { loadRaidState } from "../features/raid/raidState.service";
import { getLoggerForGuild } from "../utils/logger";

export async function forceStartRaidCommand(interaction: any) {
  const callerName = interaction.user.globalName || interaction.user.username;

  const guildId = interaction.guildId;
  if (!guildId) {
    return interaction.reply("Cette commande n'est disponible que sur un serveur.");
  }

  const logger = getLoggerForGuild(guildId);

  const OWNER_ID = process.env.ADMIN_ID;
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply(`Non ${callerName} tu ne lanceras pas de raid ici.`);
  }

  const guildConfig = getGuildConfig(guildId);
  if (!guildConfig) {
    return interaction.reply("❌ Configuration du serveur introuvable pour le salon d'annonce des raids.");
  }

  const generation = interaction.options.getInteger("generation") ?? undefined;
  const newZone = interaction.options.getBoolean("nouvelle-zone") ?? undefined;

  await interaction.deferReply({ ephemeral: true });

  const currentState = await loadRaidState(guildId);
  if (currentState.status === "registration") {
    await interaction.editReply(
      `Un raid est déjà en cours d'inscription (zone « ${currentState.zone} »). Clôture-le avec \`/raid-force-end\` avant d'en lancer un autre.`,
    );
    return;
  }

  logger.info(
    {
      event: "raid_force_start_requested",
      guildId,
      requestedBy: callerName,
      generation: generation ?? null,
      newZone: newZone ?? null,
    },
    "🛠️ Lancement forcé d'un raid",
  );

  try {
    await openRaidRegistration(guildId, guildConfig.raidAnnounceChannelId, (id) =>
      generateRaidState(id, { generation, newZone }),
    );

    const opened = await loadRaidState(guildId);
    await interaction.editReply(
      `✅ Raid lancé : gen${opened.generation}, zone « ${opened.zone} », ` +
        `${opened.raidPokemon?.name} (difficulté ${opened.raidPokemon?.difficulty}). L'annonce est partie dans le salon dédié.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error({
      message: "[RAID] Échec du lancement forcé du raid",
      guildId,
      generation: generation ?? null,
      newZone: newZone ?? null,
      error: message,
    });

    await interaction.editReply(`❌ Impossible de lancer le raid : ${message}`);
  }
}
