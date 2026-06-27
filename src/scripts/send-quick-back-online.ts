import { Client, EmbedBuilder, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.MAIN_CHANNEL_ID;

if (!TOKEN || !CHANNEL_ID) {
  console.error("DISCORD_TOKEN et MAIN_CHANNEL_ID requis dans le .env");
  process.exit(1);
}

const embed = new EmbedBuilder()
  .setColor(0x2ECC71)
  .setTitle("✅ C'est reparti !")
  .setDescription("Les systèmes sont de nouveau en ligne. Que le sort vous soit favorable, dresseurs.")
  .setFooter({ text: "— Centre AURORA" })
  .setTimestamp();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID!);
    if (!channel || !channel.isSendable()) {
      console.error("Salon introuvable ou non envoyable.");
      process.exit(1);
    }
    await channel.send({ embeds: [embed] });
    console.log("Message de reprise envoyé !");
  } catch (err) {
    console.error("Erreur:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(TOKEN);
