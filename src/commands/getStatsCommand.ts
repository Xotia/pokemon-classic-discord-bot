import {
  EmbedBuilder,
  ChatInputCommandInteraction
} from 'discord.js';

import { loadPokemonStats } from '../utils/loadPokemonStats'; 
import { getUniquePokemonCaughtByPlayer } from '../methods/file/getUniquePokemonCaughtByPlayer';


export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply();

    const stats = await loadPokemonStats();

    const playerRanking = Object.entries(stats.pokemonPerPlayer || {})
      .map(([playerName, pokemons = {}]) => ({
        name: playerName,
        total: stats.playerTotals?.[playerName] || 0,
        uniques: Object.keys(pokemons).length,
        shinies: stats.shinyCaptures?.[playerName] || 0
      }))
      .sort((a, b) => b.uniques - a.uniques);

    const pokemonGroups: Record<number, string[]> = {};
    if (stats.pokemonsTotals) {
      Object.entries(stats.pokemonsTotals).forEach(([name, count]) => {
        if (!pokemonGroups[count]) pokemonGroups[count] = [];
        pokemonGroups[count].push(name);
      });
    }

    const topCounts = Object.keys(pokemonGroups)
      .map(Number)
      .sort((a, b) => b - a);

    const embed = new EmbedBuilder()
      .setTitle('🏆 **CLASSEMENT BOT CREATURES HOARDER** 🏆')
      .setDescription(`**${stats.totalCaptures || 0} POKÉMONS CAPTURÉS !** ✨`)
      .setColor(0xFF6B6B)
      .addFields(
        {
          name: '🥇 **TOP JOUEURS**',
          value: playerRanking.length 
            ? playerRanking.slice(0, 10).map((p, i) => 
                `${i + 1} - **${p.name.padEnd(15)}** ${p.total} | ${getUniquePokemonCaughtByPlayer(p.name)} différents | ✨${p.shinies}`
              ).join('\n')
            : 'Aucune stat disponible',
          inline: false
        },
        {
          name: '🔥 **TOP 3 POKÉMONS**',
          value: topCounts.length
            ? topCounts.slice(0, 3).map((count, i) => {
              const pokemons = pokemonGroups[count]?.slice(0, 3).join(', ') || '';
              const more = pokemonGroups[count]?.length > 3 ? ` +${pokemonGroups[count].length - 3}` : '';
              return `🥇🥈🥉`.split('')[i] + ` **${count}x** ${pokemons}${more}`;
            }).join('\n')
            : 'Aucune stat disponible',
          inline: false
        }
      )
      .setFooter({
        text: `Total joueurs: ${Object.keys(stats.playerTotals || {}).length}`
      });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('/stats erreur:', error);
    await interaction.editReply?.('⚠️ Stats indisponibles.')
      .catch(() => console.log('Interaction déjà fermée'));
  }
}

