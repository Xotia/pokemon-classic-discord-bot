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

  if (!isTargetableRarity(rarity)) {
    await interaction.editReply("Rareté invalide.");
    return;
  }

  await handleTargetedCapture(interaction, guildId, zone, rarity);
}
