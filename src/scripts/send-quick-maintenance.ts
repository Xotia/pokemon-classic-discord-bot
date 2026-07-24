import { EmbedBuilder } from "discord.js";
import { broadcastEmbed } from "./lib/broadcast";

const embed = new EmbedBuilder()
  .setColor(0xFFCC00)
  .setTitle("⚡ Micro-maintenance en cours")
  .setDescription("Un ajustement rapide des systèmes est en cours. Le Centre sera de nouveau opérationnel dans quelques instants.")
  .setFooter({ text: "— Centre AURORA" })
  .setTimestamp();

broadcastEmbed(embed, "src/scripts/send-quick-maintenance.ts", { channelField: "general" });
