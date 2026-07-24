import { EmbedBuilder } from "discord.js";
import { broadcastEmbed } from "./lib/broadcast";

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

broadcastEmbed(embed, "src/scripts/announcements/send-back-online.ts", { channelField: "main" });
