import { EmbedBuilder, EmbedField } from 'discord.js';
import { isValidHttpUrl } from './isValidHttpUrl';
export function buildEmbed(
  title: string,
  image: string,
  color: number,
  description: string,
  footer: string,
  fields: EmbedField[] = [],
): EmbedBuilder {
  const imageUrl = isValidHttpUrl(image) ? image : null;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setImage(imageUrl)
    .setColor(color)
    .setDescription(description)
    .setFooter({ text: footer });

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  return embed;
}