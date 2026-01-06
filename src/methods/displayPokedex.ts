import { EmbedBuilder } from 'discord.js';
import players from '../../data/players.json';
import { buildPokedex } from './buildPokedex';

interface PlayerData {
    captures: number[];
}

const playerData = players as Record<string, PlayerData>;

export function displayPokedex(interaction: any): EmbedBuilder {
    const userId = interaction.user.id;
    const data = playerData[userId];
    const pokedex = buildPokedex(data.captures);
    const pokemonNumberThatStillNeedToBeCaptured = 151 - data.captures.length;
    const footer = `Il te reste ${pokemonNumberThatStillNeedToBeCaptured} Pokémon à capturer pour compléter ton Pokédex !`;

    if (!data) {
        return interaction.reply("Tu n'as encore capturé aucun Pokémon.");
    }

    const embed = new EmbedBuilder()
        .setTitle(
            `${interaction.user.globalName}, voici ton Pokédex :`
        )
        .setDescription(pokedex)
        .setColor(0x0099ff)
        .setFooter({ text: footer });

    return embed;
}