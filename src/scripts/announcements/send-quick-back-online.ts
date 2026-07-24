import { EmbedBuilder } from "discord.js";
import { broadcastEmbed } from "./lib/broadcast";

const embed = new EmbedBuilder()
  .setColor(0x2ECC71)
  .setTitle("✅ C'est reparti !")
  .setDescription("Les systèmes sont de nouveau en ligne. Que le sort vous soit favorable, dresseurs.")
  .setFooter({ text: "— Centre AURORA" })
  .setTimestamp();

broadcastEmbed(embed, "src/scripts/announcements/send-quick-back-online.ts", { channelField: "general" });
