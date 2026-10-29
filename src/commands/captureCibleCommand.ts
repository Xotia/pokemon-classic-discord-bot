import { createProfileIfNeeded } from "../methods/player/createProfileIfNeeded";
import { ensureGuildDataFiles } from "../config/guilds";
import { isTargetableRarity } from "../config/researchCost";
import { handleTargetedCapture } from "../methods/research/handleTargetedCapture";

export async function captureCibleCommand(interaction: any) {
  await interaction.deferReply();

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply("Cette commande n'est disponible que sur un serveur.");
    return;
  }
  ensureGuildDataFiles(guildId);

  createProfileIfNeeded(interaction, guildId);

  const zone = interaction.options.getString("zone", true);
  const rarity = interaction.options.getString("rarity", true);
  // Absent ou true : comportement habituel. false : uniquement des Pokémon jamais capturés.
  const dejaCapture = interaction.options.getBoolean("deja_capture") ?? true;

  if (!isTargetableRarity(rarity)) {
    await interaction.editReply("Rareté invalide.");
    return;
  }

  await handleTargetedCapture(
    interaction,
    guildId,
    zone,
    rarity,
    { userId: interaction.user.id, name: interaction.user.globalName || interaction.user.username },
    { chargeCost: true, onlyUncaptured: !dejaCapture },
  );
}
