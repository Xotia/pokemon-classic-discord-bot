import { EmbedBuilder } from "discord.js";
import { broadcastEmbed } from "./lib/broadcast";

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

broadcastEmbed(embed, "src/scripts/send-maintenance.ts", { channelField: "general" });
