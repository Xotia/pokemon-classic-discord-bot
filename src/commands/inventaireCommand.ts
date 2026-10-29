import { EmbedBuilder } from "discord.js";
import { getItemDefinition } from "../config/items";
import { getPlayer } from "../utils/loadPlayer";

export async function inventaireCommand(interaction: any) {
  await interaction.deferReply();

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply("Cette commande n'est disponible que sur un serveur.");
    return;
  }

  const player = getPlayer(guildId, interaction.user.id);
  const owned = Object.entries(player?.items ?? {}).filter(([, quantity]) => quantity > 0);

  if (owned.length === 0) {
    await interaction.editReply("🎒 Ton inventaire est vide pour l'instant.");
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x8b5a2b)
    .setTitle(`🎒 Inventaire de ${player?.name ?? interaction.user.username}`)
    .setDescription(
      owned
        .map(([itemId, quantity]) => {
          const { name, emoji } = getItemDefinition(itemId);
          return `${emoji} **${name}** × ${quantity}`;
        })
        .join("\n"),
    );

  await interaction.editReply({ embeds: [embed] });
}
