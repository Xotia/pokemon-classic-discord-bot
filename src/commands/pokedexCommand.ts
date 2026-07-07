import { createProfileIfNeeded } from "../methods/player/createProfileIfNeeded";
import { displayPokedex } from "../methods/pokedex/displayPokedex";

export async function pokedexCommand(interaction: any) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply("Cette commande n'est disponible que sur un serveur.");
    return;
  }
  createProfileIfNeeded(interaction, guildId);
  return displayPokedex(interaction, guildId);
}
