import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import logger from "../utils/logger";
import { openWorldBoss } from "../features/worldBoss/worldBossScheduler";
import { getAliveWorldBosses } from "../features/worldBoss/selectWorldBoss";
import { getDefeatedBossIds } from "../features/worldBoss/worldBossHistory.service";
import { loadWorldBossState } from "../features/worldBoss/worldBossState.service";
import { formatWorldBossPortalName } from "../features/worldBoss/worldBossPortalTier";

export async function forceStartWorldBossCommand(interaction: ChatInputCommandInteraction) {
  const callerName = interaction.user.globalName || interaction.user.username;

  if (!interaction.guildId) {
    return interaction.reply("Cette commande n'est disponible que sur un serveur.");
  }

  if (interaction.user.id !== process.env.ADMIN_ID) {
    return interaction.reply({
      content: `Non ${callerName}, tu n'ouvriras pas de portail ici.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const bossId = interaction.options.getString("boss") ?? undefined;
  const difficulty = interaction.options.getInteger("difficulte") ?? undefined;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const currentState = await loadWorldBossState();
  if (currentState.status === "registration") {
    await interaction.editReply(
      `Un world boss est déjà ouvert (**${currentState.boss?.name}**). Clôture-le avec \`/world-boss-force-end\` avant d'en ouvrir un autre.`,
    );
    return;
  }

  logger.info(
    {
      event: "world_boss_force_start_requested",
      requestedBy: callerName,
      bossId: bossId ?? null,
      difficulty: difficulty ?? null,
    },
    "🛠️ Ouverture forcée d'un world boss",
  );

  try {
    const state = await openWorldBoss(interaction.client, { bossId, difficulty });

    if (!state) {
      // Le seul cas restant : plus aucun boss tirable. On le dit, plutôt que de
      // laisser l'admin face à un silence.
      await interaction.editReply(
        "❌ Vivier épuisé : tous les world boss de `data/world-boss-list.json` ont été vaincus. Ajoute des entrées pour rouvrir des portails.",
      );
      return;
    }

    await interaction.editReply(
      `✅ Portail ouvert : **${state.boss?.name}** — ${formatWorldBossPortalName(state.boss?.difficulty ?? 1)}, difficulté ×${state.boss?.difficulty}. L'annonce est partie dans tous les serveurs.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error(
      { event: "world_boss_force_start_failed", bossId: bossId ?? null, error: message },
      "[WORLD BOSS] Échec de l'ouverture forcée",
    );

    await interaction.editReply(`❌ Impossible d'ouvrir le portail : ${message}`);
  }
}

/** Autocomplétion de l'option `boss` : seuls les boss encore vivants. */
export async function autocompleteWorldBossId(search: string) {
  const defeatedBossIds = await getDefeatedBossIds();

  return getAliveWorldBosses(defeatedBossIds)
    .filter(
      (boss) =>
        boss.id.toLowerCase().includes(search) || boss.name.toLowerCase().includes(search),
    )
    .slice(0, 25)
    .map((boss) => ({ name: `${boss.name} (${boss.id})`.slice(0, 100), value: boss.id }));
}
