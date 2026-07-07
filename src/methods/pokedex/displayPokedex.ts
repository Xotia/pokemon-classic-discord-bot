import {
  ChatInputCommandInteraction,
  ComponentType,
} from "discord.js";
import { Player } from "../../types/Player";
import { getPlayer } from "../../utils/loadPlayer";
import { getPokedexCaptureIds } from "./getPokedexCaptureIds";
import { buildPokedexPageEmbed } from "../embed/buildPokedexPageEmbed";
import { buildPokedexButtons } from "./buildPokedexButtons";
import { buildDisabledPokedexButtons } from "./buildDisabledPokedexButtons";

const POKEMON_PER_PAGE = parseInt(process.env.POKEMON_PER_PAGE || "20", 10);
const BUTTON_TIMEOUT = parseInt(process.env.BUTTON_TIMEOUT || "120000", 10);

export async function displayPokedex(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await interaction.deferReply();

  const userId = interaction.user.id;
  const player = getPlayer(guildId, userId) as Player | null;

  if (!player || Object.keys(player.captureList ?? {}).length === 0) {
    await interaction.editReply("Tu n'as encore capturé aucun Pokémon.");
    return;
  }

  const captureIds = getPokedexCaptureIds(player);
  const totalPages = Math.ceil(captureIds.length / POKEMON_PER_PAGE);
  let currentPage = 0;

  await interaction.editReply({
    embeds: [
      await buildPokedexPageEmbed(
        interaction,
        player,
        currentPage,
        totalPages,
        POKEMON_PER_PAGE,
      ),
    ],
    components: totalPages > 1 ? [buildPokedexButtons(currentPage, totalPages)] : [],
  });

  if (totalPages === 1) {
    return;
  }

  const message = await interaction.fetchReply();
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: BUTTON_TIMEOUT,
  });

  collector.on("collect", async (buttonInteraction: any) => {
    if (buttonInteraction.user.id !== userId) {
      await buttonInteraction.reply({
        content: "Ce n'est pas ton Pokédex !",
        ephemeral: true,
      });
      return;
    }

    switch (buttonInteraction.customId) {
      case "first":
        currentPage = 0;
        break;
      case "prev":
        currentPage = Math.max(0, currentPage - 1);
        break;
      case "next":
        currentPage = Math.min(totalPages - 1, currentPage + 1);
        break;
      case "last":
        currentPage = totalPages - 1;
        break;
    }

    await buttonInteraction.update({
      embeds: [
        await buildPokedexPageEmbed(
          interaction,
          player,
          currentPage,
          totalPages,
          POKEMON_PER_PAGE,
        ),
      ],
      components: [buildPokedexButtons(currentPage, totalPages)],
    });
  });

  collector.on("end", async () => {
    await message.edit({
      components: [buildDisabledPokedexButtons()],
    }).catch(() => {});
  });
}