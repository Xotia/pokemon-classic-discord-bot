import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function buildDisabledPokedexButtons() {
   return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("first").setLabel("⏮️").setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId("prev").setLabel("◀️").setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId("next").setLabel("▶️").setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId("last").setLabel("⏭️").setStyle(ButtonStyle.Primary).setDisabled(true),
  );
}