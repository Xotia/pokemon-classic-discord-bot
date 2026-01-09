
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import players from '../../../data/players.json';
import { buildPokedex } from '../embed/buildPokedex';

interface PlayerData {
    randomCaptures: number[];
}


const POKEMON_PER_PAGE = parseInt(process.env.POKEMON_PER_PAGE || '20');
const BUTTON_TIMEOUT = parseInt(process.env.BUTTON_TIMEOUT || '120000');
const playerData = players as Record<string, PlayerData>;

export async function displayRandomPokedex(interaction: any): Promise<void> {
    const userId = interaction.user.id;
    const data = playerData[userId];

    if (!data || !data.randomCaptures || data.randomCaptures.length === 0) {
        await interaction.editReply("Tu n'as encore capturé aucun Pokémon.");
        return;
    }

    // Diviser les randomCaptures en pages
    const randomCaptures = data.randomCaptures;
    const totalPages = Math.ceil(randomCaptures.length / POKEMON_PER_PAGE);
    let currentPage = 0;

    // Fonction pour créer l'embed d'une page
    const createPageEmbed = (page: number): EmbedBuilder => {
        const start = page * POKEMON_PER_PAGE;
        const end = Math.min(start + POKEMON_PER_PAGE, randomCaptures.length);
        const pageRandomCaptures = randomCaptures.slice(start, end);
        
        const pokedex = buildPokedex(pageRandomCaptures);
        const pokemonNumberThatStillNeedToBeCaptured = 151 - data.randomCaptures.length;
        const footer = `Page ${page + 1}/${totalPages} • Il te reste ${pokemonNumberThatStillNeedToBeCaptured} Pokémon à capturer !`;

        return new EmbedBuilder()
            .setTitle(`${interaction.user.globalName}, voici ton Pokédex :`)
            .setDescription(pokedex)
            .setColor(0x0099ff)
            .setFooter({ text: footer });
    };

    // Fonction pour créer les boutons
    const createButtons = (page: number): ActionRowBuilder<ButtonBuilder> => {
        return new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('first')
                    .setLabel('⏮️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('◀️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1),
                new ButtonBuilder()
                    .setCustomId('last')
                    .setLabel('⏭️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1)
            );
    };

    // Envoi du message initial
    await interaction.editReply({
        embeds: [createPageEmbed(currentPage)],
        components: totalPages > 1 ? [createButtons(currentPage)] : []
    });

    // Si une seule page, pas besoin de collecteur
    if (totalPages === 1) return;

    // Récupérer le message après editReply
    const message = await interaction.fetchReply();

    // Collecteur de boutons pour la pagination
    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: BUTTON_TIMEOUT
    });

    collector.on('collect', async (buttonInteraction:any) => {
        // Vérifier que c'est bien l'utilisateur qui a demandé le Pokédex
        if (buttonInteraction.user.id !== userId) {
            await buttonInteraction.reply({
                content: "Ce n'est pas ton Pokédex !",
                ephemeral: true
            });
            return;
        }

        // Gérer la navigation
        switch (buttonInteraction.customId) {
            case 'first':
                currentPage = 0;
                break;
            case 'prev':
                currentPage = Math.max(0, currentPage - 1);
                break;
            case 'next':
                currentPage = Math.min(totalPages - 1, currentPage + 1);
                break;
            case 'last':
                currentPage = totalPages - 1;
                break;
        }

        // Mettre à jour le message
        await buttonInteraction.update({
            embeds: [createPageEmbed(currentPage)],
            components: [createButtons(currentPage)]
        });
    });

    collector.on('end', async () => {
        // Désactiver tous les boutons après le timeout
        const disabledRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('first')
                    .setLabel('⏮️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('◀️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('last')
                    .setLabel('⏭️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true)
            );

        await message.edit({ components: [disabledRow] }).catch(() => {});
    });
}