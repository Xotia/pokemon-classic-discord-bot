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
  console.error("Usage: npx ts-node src/scripts/send-maintenance.ts --channelId <id>");
  console.error("DISCORD_TOKEN requis dans le .env, --channelId requis en argument.");
  process.exit(1);
}

const embed = new EmbedBuilder()
  .setColor(0xFFA500)
  .setTitle("🔧 ALERTE — CENTRE DE RECHERCHE AURORA")
  .setDescription(
    [
      "**À l'attention de tous les dresseurs de terrain,**",
      "",
      "Les dernières vagues d'assauts coordonnés de Pokémon enragés ont laissé des traces plus profondes que prévu sur nos infrastructures.",
      "",
      "Les ingénieurs du Centre rapportent des **fissures critiques** dans le blindage du périmètre nord, une **surcharge du réseau de capteurs** et des **dysfonctionnements intermittents** sur les systèmes de capture à distance.",
      "",
      "La Professeure Voss a pris la décision de lancer un **protocole de maintenance renforcée**.",
      "",
      "Durant cette intervention :",
      "- 🏗️ Les **structures défensives** endommagées seront reconstruites et consolidées",
      "- 🔌 Le **réseau de détection** sera entièrement recalibré pour compenser les interférences post-raid",
      "- 🛡️ Les **boucliers périmétrique** recevront une mise à niveau logicielle critique",
      "- 📡 Les **relais de communication** seront redéployés sur de nouvelles fréquences sécurisées",
      "",
      "**Toutes les opérations de terrain sont temporairement suspendues** — captures, explorations et inscriptions aux raids.",
      "",
      "*Ce n'est qu'une question de temps avant que les Pokémon ne frappent à nouveau. Quand le Centre rouvrira, nous serons prêts. Soyez-le aussi.*",
    ].join("\n")
  )
  .setFooter({
    text: "— Département Opérations & Maintenance, Centre AURORA\nFin de transmission.",
  })
  .setTimestamp();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  console.log(`Connecté en tant que ${client.user?.tag}`);
  try {
    const channel = await client.channels.fetch(CHANNEL_ID!);
    if (!channel || !channel.isSendable()) {
      console.error("Salon introuvable ou non envoyable.");
      process.exit(1);
    }
    await channel.send({ embeds: [embed] });
    console.log("Message de maintenance envoyé !");
  } catch (err) {
    console.error("Erreur:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(TOKEN);
