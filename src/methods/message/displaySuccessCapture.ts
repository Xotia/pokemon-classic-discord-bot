import { EmbedBuilder } from 'discord.js';

export function displaySuccessCapture(interaction: any, pokemon: { id: number; name: string; spawnRate: number; catchRateRaw: number; image: string; shinyImage: string; }, spriteUrl: string, embed: EmbedBuilder, isShiny: boolean) {
    const trainerName = interaction.user.globalName || interaction.user.username;

    embed.setDescription(
      isShiny
        ? `🎉 ${trainerName} a capturé un **${pokemon.name}** shiny !`
        : `${trainerName} a capturé un **${pokemon.name}** !`
    );
}