import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from 'discord.js';

const rarityEmojiMap: Record<string, string> = {
  common: '⚪',
  uncommon: '🟢',
  rare: '🔵',
  very_rare: '🩵',
  epic: '🟣',
  ultra_rare: '🟠',
  mythic: '🌸',
  legendary: '🟡',
  unknown: '⚫',
};

import { rarityBoostedList, RarityData, rarityList } from '../config/rarity';

function formatRates(list: RarityData[]): string {
  const totalWeight = list.reduce((sum, item) => sum + item.weight, 0);

  return list
    .map((item) => {
      const percent = ((item.weight / totalWeight) * 100).toFixed(2);
      const emoji = rarityEmojiMap[item.rarity] ?? '⚪';
      return `${emoji} **${item.french}** : ${percent}%`;
    })
    .join('\n');
}

export async function getRarityCommand(interaction: any) {
    const normalRates = formatRates(rarityList);
    const boostedRates = formatRates(rarityBoostedList);

    const embed = new EmbedBuilder()
        .setTitle('🎲 Taux de rareté')
        .setColor(0xFFD700)
        .setDescription('Voici les chances actuelles d’apparition par rareté.')
        .addFields(
            {
                name: 'Mode normal',
                value: normalRates,
                inline: true,
            },
            {
                name: 'Mode boosté',
                value: boostedRates,
                inline: true,
            }
        )
        .setFooter({
            text: 'Les pourcentages sont calculés à partir des poids définis dans rarity.ts',
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}