require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { sendAuroraLoreMessageNewAdventure } = require('./sendAuroraLoreMessageNewAdventure.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.LORE_CHANNEL_ID;

client.once('ready', async () => {
  console.log(`Connecté en tant que ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID);
  await sendAuroraLoreMessageNewAdventure(channel);

  console.log('Message envoyé !');
  process.exit(0);
});

client.login(TOKEN);
