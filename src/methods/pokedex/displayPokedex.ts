import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ChatInputCommandInteraction } from 'discord.js';
import { buildPokedex } from '../embed/buildPokedex';
import { Player } from '../../types/Player';
import { getPlayer } from '../../utils/loadPlayer';
import { getTotalPokemonNumber } from './getTotalPokemonNumber';

const POKEMON_PER_PAGE = parseInt(process.env.POKEMON_PER_PAGE || '20');
const BUTTON_TIMEOUT = parseInt(process.env.BUTTON_TIMEOUT || '120000');

export async function displayPokedex(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  const userId = interaction.user.id;
  const data = getPlayer(userId.toString()) as Player | null;

  if (!data || Object.keys(data.captureList).length === 0) {
    await interaction.editReply("Tu n'as encore capturé aucun Pokémon.");
    return;
  }

  const captureListArray = Object.keys(data.captureList)
    .map(id => parseInt(id))
    .sort((a, b) => a - b);

  const totalPages = Math.ceil(captureListArray.length / POKEMON_PER_PAGE);
  let currentPage = 0;

  const createPageEmbed = async (page: number): Promise<EmbedBuilder> => {
    const totalPokemonNumber = getTotalPokemonNumber();
    const start = page * POKEMON_PER_PAGE;
    const end = Math.min(start + POKEMON_PER_PAGE, captureListArray.length);
    const pagecaptureList = captureListArray.slice(start, end);

    const pokedex = await buildPokedex(pagecaptureList, data);
    const uniqueCount = Object.keys(data.captureList).length;
    const pokemonNumberThatStillNeedToBeCaptured = totalPokemonNumber - uniqueCount;
    const footer = `Page ${page + 1}/${totalPages} • ${uniqueCount}/${totalPokemonNumber} (${pokemonNumberThatStillNeedToBeCaptured} restants)`;

    return new EmbedBuilder()
      .setTitle(`${interaction.user.globalName ?? interaction.user.username}, voici ton Pokédex :`)
      .setDescription(pokedex)
      .setColor(0x0099ff)
      .setFooter({ text: footer });
  };

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

  await interaction.editReply({
    embeds: [await createPageEmbed(currentPage)],
    components: totalPages > 1 ? [createButtons(currentPage)] : []
  });

  if (totalPages === 1) return;

  const message = await interaction.fetchReply();

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: BUTTON_TIMEOUT
  });

  collector.on('collect', async (buttonInteraction: any) => {
    if (buttonInteraction.user.id !== userId) {
      await buttonInteraction.reply({
        content: "Ce n'est pas ton Pokédex !",
        ephemeral: true
      });
      return;
    }

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

    await buttonInteraction.update({
      embeds: [await createPageEmbed(currentPage)],
      components: [createButtons(currentPage)]
    });
  });

  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder().setCustomId('first').setLabel('⏮️').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('last').setLabel('⏭️').setStyle(ButtonStyle.Primary).setDisabled(true)
      );

    await message.edit({ components: [disabledRow] }).catch(() => { });
  });
}
