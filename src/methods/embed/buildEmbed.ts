import { EmbedBuilder } from 'discord.js';
export function buildEmbed(title: string, image: string, color: number, description: string, footer: string): EmbedBuilder {
    const imageUrl = isValidHttpUrl(image) ? image : null;

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setImage(imageUrl)
        .setColor(color)
        .setDescription(description)
        .setFooter({ text: footer });
    return embed;
}

function isValidHttpUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith('http');
  } catch {
    return false;
  }
}