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
  console.error("Usage: npx ts-node src/scripts/send-back-online.ts --channelId <id>");
  console.error("DISCORD_TOKEN requis dans le .env, --channelId requis en argument.");
  process.exit(1);
}

const embed = new EmbedBuilder()
  .setColor(0x2ECC71)
  .setTitle("✅ CENTRE DE RECHERCHE AURORA — SYSTÈMES OPÉRATIONNELS")
  .setDescription(
    [
      "**Dresseurs, le Centre est de nouveau pleinement opérationnel.**",
      "",
      "Les équipes techniques ont travaillé sans relâche. Les réparations sont terminées et les résultats dépassent nos attentes.",
      "",
      "État des systèmes :",
      "- 🏗️ **Structures défensives** — reconstruites et renforcées avec un alliage de nouvelle génération",
      "- 🔌 **Réseau de détection** — recalibré, sensibilité augmentée de 40%",
      "- 🛡️ **Boucliers périmétrique** — mise à niveau complète, protocole v2 actif",
      "- 📡 **Relais de communication** — redéployés sur fréquences sécurisées",
      "",
      "**Toutes les opérations de terrain reprennent immédiatement** — captures, explorations et inscriptions aux raids.",
      "",
      "*Les Pokémon sauvages n'ont pas attendu. Nos capteurs détectent déjà une activité anormale aux frontières du périmètre. Le calme ne durera pas — profitez-en.*",
    ].join("\n")
  )
  .setFooter({
    text: "— Professeure LYRA VOSS, Directrice scientifique, Centre AURORA\nFin de transmission.",
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
    console.log("Message de reprise envoyé !");
  } catch (err) {
    console.error("Erreur:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(TOKEN);
