import {
  EmbedBuilder,
  ChatInputCommandInteraction
} from 'discord.js';

import { promises as fs } from 'fs';
import { loadPokemonStats } from '../utils/loadPokemonStats';
import { getUniquePokemonCaughtByPlayer } from '../methods/player/getUniquePokemonCaughtByPlayer';
import { readPlayers } from '../utils/jsonPlayers';
import { Player } from '../types/Player';
import { POKEMON_DB } from '../config/paths';


export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply();

    const stats = await loadPokemonStats();
    const players = await readPlayers();
    const pokemonList = JSON.parse(await fs.readFile(POKEMON_DB, 'utf-8'));
    const totalAvailable = Object.keys(pokemonList).length;

    const playerRanking = Object.entries(stats.pokemonPerPlayer || {})
      .map(([playerName, pokemons = {}]) => ({
        name: playerName,
        total: stats.playerTotals?.[playerName] || 0,
        uniques: Object.keys(pokemons).length,
      }))
      .sort((a, b) => b.uniques - a.uniques);

    const shinyRanking = Object.entries(stats.shinyCaptures || {})
      .map(([playerName, shinies]) => ({ name: playerName, shinies }))
      .filter(p => p.shinies > 0)
      .sort((a, b) => b.shinies - a.shinies);

    const levelRanking = Object.values(players)
      .filter((p: Player) => (p.level ?? 0) > 0)
      .sort((a: Player, b: Player) => {
        const levelDiff = (b.level ?? 0) - (a.level ?? 0);
        if (levelDiff !== 0) return levelDiff;
        return (b.xp ?? 0) - (a.xp ?? 0);
      });

    const pokedexRanking = Object.values(players)
      .map((p: Player) => {
        const uniques = Object.keys(p.captureList ?? {}).length;
        return { name: p.name, uniques, percent: Math.round((uniques / totalAvailable) * 100) };
      })
      .filter(p => p.uniques > 0)
      .sort((a, b) => b.uniques - a.uniques);

    const raidRanking = Object.values(players)
      .filter((p: Player) => (p.raidWins ?? 0) > 0)
      .sort((a: Player, b: Player) => (b.raidWins ?? 0) - (a.raidWins ?? 0))
      .slice(0, 5);

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
                `${i + 1} - **${p.name.padEnd(15)}** ${p.total} | ${getUniquePokemonCaughtByPlayer(p.name)} différents`
              ).join('\n')
            : 'Aucune stat disponible',
          inline: false
        },
        {
          name: '✨ **TOP SHINY**',
          value: shinyRanking.length
            ? shinyRanking.slice(0, 10).map((p, i) =>
                `${i + 1} - **${p.name}** — ${p.shinies} shiny${p.shinies > 1 ? 's' : ''}`
              ).join('\n')
            : 'Aucun shiny capturé pour le moment',
          inline: false
        },
        {
          name: '📈 **TOP LEVEL**',
          value: levelRanking.length
            ? levelRanking.slice(0, 10).map((p: Player, i: number) =>
                `${i + 1} - **${p.name}** — Nv.${p.level} (${p.xp} XP)`
              ).join('\n')
            : 'Aucun joueur classé pour le moment',
          inline: false
        },
        {
          name: '📖 **TOP POKÉDEX**',
          value: pokedexRanking.length
            ? pokedexRanking.slice(0, 10).map((p, i) =>
                `${i + 1} - **${p.name}** — ${p.uniques}/${totalAvailable} (${p.percent}%)`
              ).join('\n')
            : 'Aucun Pokémon capturé pour le moment',
          inline: false
        },
        {
          name: '⚔️ **TOP RAIDS**',
          value: raidRanking.length
            ? raidRanking.map((p: Player, i: number) => `${i + 1} - **${p.name}** — ${p.raidWins} victoire${(p.raidWins ?? 0) > 1 ? 's' : ''}`).join('\n')
            : 'Aucun raid remporté pour le moment',
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
    console.error('/leaderboard erreur:', error);
    await interaction.editReply?.('⚠️ Leaderboard indisponible.')
      .catch(() => console.log('Interaction déjà fermée'));
  }
}

