import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { loadGuildRegistry } from "../../config/guilds";
import { buildMeteoriteWarningEmbed } from "../../features/meteoriteEvent/buildMeteoriteLoreEmbeds";
import { loadMeteoriteEventState, saveMeteoriteEventState } from "../../features/meteoriteEvent/meteoriteEventState.service";
import { resolveTargetChannelId } from "./lib/broadcast";

dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error("DISCORD_TOKEN requis dans le .env.");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const embed = buildMeteoriteWarningEmbed();

client.once("ready", async () => {
  const guilds = loadGuildRegistry();
  for (const guild of guilds) {
    const channelId = resolveTargetChannelId(guild, "lore");
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isSendable()) {
        console.error(`Salon introuvable (${guild.name}, channelId=${channelId}).`);
        continue;
      }
      await channel.send({ embeds: [embed] });
      console.log(`Alerte météorite envoyée sur ${guild.name}.`);
    } catch (err) {
      console.error(`Erreur sur ${guild.name}:`, err);
      continue;
    }

    const state = await loadMeteoriteEventState(guild.guildId);
    state.warningAnnounced = true;
    await saveMeteoriteEventState(guild.guildId, state);
    console.log(`État mis à jour pour ${guild.name} (warningAnnounced = true).`);
  }

  client.destroy();
  process.exit(0);
});

client.login(TOKEN);
