import { Client, EmbedBuilder, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { loadGuildRegistry } from "../../config/guilds";

dotenv.config();

function parseChannelId(argv: string[]): string | null {
  const index = argv.indexOf("--channelId");
  return index !== -1 ? argv[index + 1] : null;
}

/**
 * Envoie un embed sur le raidAnnounceChannelId de tous les serveurs du registre.
 * Passer --channelId <id> pour cibler un seul salon (test) à la place.
 */
export function broadcastEmbed(embed: EmbedBuilder, scriptRelativePath: string): void {
  const TOKEN = process.env.DISCORD_TOKEN;
  const CHANNEL_ID = parseChannelId(process.argv.slice(2));

  if (!TOKEN) {
    console.error(`Usage: npx ts-node ${scriptRelativePath} [--channelId <id>]`);
    console.error("DISCORD_TOKEN requis dans le .env.");
    process.exit(1);
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  async function sendTo(channelId: string, label: string): Promise<void> {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isSendable()) {
        console.error(`Salon introuvable ou non envoyable (${label}, channelId=${channelId}).`);
        return;
      }
      await channel.send({ embeds: [embed] });
      console.log(`Message envoyé sur ${label}.`);
    } catch (err) {
      console.error(`Erreur sur ${label} (channelId=${channelId}):`, err);
    }
  }

  client.once("ready", async () => {
    try {
      if (CHANNEL_ID) {
        await sendTo(CHANNEL_ID, "salon ciblé");
      } else {
        for (const guild of loadGuildRegistry()) {
          await sendTo(guild.raidAnnounceChannelId, guild.name);
        }
      }
    } finally {
      client.destroy();
      process.exit(0);
    }
  });

  client.login(TOKEN);
}
