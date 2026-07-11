import { Client, EmbedBuilder, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

function parseChannelId(argv: string[]): string | null {
  const index = argv.indexOf("--channelId");
  return index !== -1 ? argv[index + 1] : null;
}

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = parseChannelId(process.argv.slice(2));

if (!TOKEN || !CHANNEL_ID) {
  console.error("Usage: npx ts-node src/scripts/send-quick-back-online.ts --channelId <id>");
  console.error("DISCORD_TOKEN requis dans le .env, --channelId requis en argument.");
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
