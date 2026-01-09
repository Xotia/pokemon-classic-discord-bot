import { EmbedBuilder } from 'discord.js';
export function buildEmbed(title: string, image: string, color: number, description: string, footer: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setImage(image)
        .setColor(color)
        .setDescription(description)
        .setFooter({ text: footer });
    return embed;
}