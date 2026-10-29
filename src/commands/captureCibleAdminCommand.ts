import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { createProfileIfNeeded } from "../methods/player/createProfileIfNeeded";
import { ensureGuildDataFiles } from "../config/guilds";
import { getTargetedCaptureMode, isTargetableRarity } from "../config/researchCost";
import { handleTargetedCapture } from "../methods/research/handleTargetedCapture";
import { getLoggerForGuild } from "../utils/logger";

/**
 * Capture cadeau : applique une capture ciblée au joueur choisi, sans toucher
 * à ses données de recherche ni à son cooldown (voir TargetedCaptureOptions).
 */
export async function captureCibleAdminCommand(interaction: ChatInputCommandInteraction) {
  const callerName = interaction.user.globalName || interaction.user.username;

  if (!interaction.guildId) {
    return interaction.reply("Cette commande n'est disponible que sur un serveur.");
  }

  if (interaction.user.id !== process.env.ADMIN_ID) {
    return interaction.reply({
      content: `Non ${callerName}, cette capture n'est pas pour toi.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const guildId = interaction.guildId;
  const targetUser = interaction.options.getUser("joueur", true);
  const zone = interaction.options.getString("zone", true);
  const rarity = interaction.options.getString("rarity", true);
  const mode = getTargetedCaptureMode(interaction.options.getBoolean("deja_capture"));

  if (!isTargetableRarity(rarity)) {
    return interaction.reply({ content: "Rareté invalide.", flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply();

  ensureGuildDataFiles(guildId);
  createProfileIfNeeded(interaction, guildId, targetUser);

  const pokemon = await handleTargetedCapture(
    interaction,
    guildId,
    zone,
    rarity,
    { userId: targetUser.id, name: targetUser.globalName || targetUser.username },
    { chargeCost: false, mode },
  );

  getLoggerForGuild(guildId).info(
    `🎁 Capture ciblée admin : admin = ${interaction.user.id} | joueur = ${targetUser.id} | Pokémon = ${pokemon ? pokemon.name : "aucun (annulée)"} | rareté = ${rarity} | zone = ${zone}`,
  );
}
