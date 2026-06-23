import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function buildPokedexButtons(page: number, totalPages: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("first")
      .setLabel("⏮️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId("prev")
      .setLabel("◀️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId("next")
      .setLabel("▶️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === totalPages - 1),
    new ButtonBuilder()
      .setCustomId("last")
      .setLabel("⏭️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === totalPages - 1),
  );
}