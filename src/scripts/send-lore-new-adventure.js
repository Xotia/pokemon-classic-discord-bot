require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { sendAuroraLoreMessageNewAdventure } = require('./sendAuroraLoreMessageNewAdventure.js');

function parseChannelId(argv) {
  const index = argv.indexOf('--channelId');
  return index !== -1 ? argv[index + 1] : null;
}

const CHANNEL_ID = parseChannelId(process.argv.slice(2));

if (!CHANNEL_ID) {
  console.error('Usage: node src/scripts/send-lore-new-adventure.js --channelId <id>');
  console.error('(copie l\'ID du salon Discord ciblé — clic droit sur le salon > Copier l\'identifiant)');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TOKEN = process.env.DISCORD_TOKEN;

client.once('ready', async () => {
  console.log(`Connecté en tant que ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID);
  await sendAuroraLoreMessageNewAdventure(channel);

  console.log('Message envoyé !');
  process.exit(0);
});

client.login(TOKEN);
