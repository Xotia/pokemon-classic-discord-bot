import {
  EmbedBuilder,
  ChatInputCommandInteraction
} from 'discord.js';

import { loadPokemonStats } from '../utils/loadPokemonStats';
import { getUniquePokemonCaughtByPlayer } from '../methods/player/getUniquePokemonCaughtByPlayer';
import { readPlayers } from '../utils/jsonPlayers';
import { Player } from '../types/Player';


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
          name: '⚔️ **TOP RAIDS**',
          value: await (async () => {
            const players = await readPlayers();
            const raidRanking = Object.values(players)
              .filter((p: Player) => (p.raidWins ?? 0) > 0)
              .sort((a: Player, b: Player) => (b.raidWins ?? 0) - (a.raidWins ?? 0))
              .slice(0, 5);
            return raidRanking.length
              ? raidRanking.map((p: Player, i: number) => `${i + 1} - **${p.name}** — ${p.raidWins} victoire${(p.raidWins ?? 0) > 1 ? 's' : ''}`).join('\n')
              : 'Aucun raid remporté pour le moment';
          })(),
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

