import { EmbedBuilder } from "discord.js";
import { broadcastEmbed } from "./lib/broadcast";

const embed = new EmbedBuilder()
  .setColor(0x8B0000)
  .setTitle("📡 TRANSMISSION CRYPTÉE — NIVEAU DE PRIORITÉ : ROUGE")
  .setDescription(
    [
      "**Dresseur,**",
      "",
      "Ce message ne te parvient pas par hasard.",
      "",
      "Depuis plusieurs mois, nos satellites enregistrent des anomalies comportementales chez des centaines d'espèces Pokémon à travers le monde. Des territoires autrefois paisibles sont devenus des zones de guerre. Des villages ont été rasés. Des routes coupées. Et personne — jusqu'ici — n'a été capable de fournir la moindre explication satisfaisante.",
      "",
      "***La vérité, nous la connaissons. Mais elle est inconfortable.***",
      "",
      "Nous avons pris trop. Les ressources, les terres, les espaces naturels. L'équilibre fragile qui permettait depuis des siècles la cohabitation entre les humains et les Pokémon s'effondre. Et eux... ils le ressentent avant nous. Ils ne sont pas devenus fous, mais qu'en est-il de nous ?",
      "",
      "Pendant des décennies, les grandes corporations ont rasé des milliers d'hectares de forêts primaires pour construire des complexes industriels dont la moitié sont aujourd'hui abandonnés. Elles ont asséché des lacs entiers pour alimenter des mines à ciel ouvert. Elles ont empoisonné des rivières au nom de la rentabilité trimestrielle. Et à chaque fois qu'un scientifique levait la main pour alerter... *un lobbyiste payé par ces mêmes entreprises se chargeait de l'étouffer.*",
      "",
      "Les gouvernements ? Ils savaient. Les rapports existaient. Les données étaient là, claires, alarmantes. Mais les élections approchaient, les financements de campagne aussi, et il est toujours plus simple de signer un accord international que personne ne respectera plutôt que de s'attaquer aux vrais responsables.",
      "",
      "*Résultat : les Pokémon — eux — n'ont pas attendu les prochains sommets climatiques.*",
      "",
      "Ils ont répondu. Instinctivement. Violemment. Comme n'importe quel être vivant acculé dans ses derniers retranchements.",
      "",
      "***Nous ne sommes pas face à une menace. Nous sommes face à une facture.***",
      "",
      "Et c'est nous — les dresseurs, les citoyens, les gens du terrain — qui allons devoir la régler à la place de ceux qui l'ont signée.",
    ].join("\n")
  )
  .addFields(
    {
      name: "🔬 Centre de Recherche AURORA",
      value: "Établi au cœur d'une zone d'instabilité maximale. C'est là que les phénomènes sont les plus intenses — et donc là où les données sont les plus précieuses. Nous avons besoin de dresseurs sur le terrain. Pas des scientifiques. **Des gens capables de survivre, d'observer, et de rapporter.**\n\n*Tu as été identifié comme l'un d'eux.*",
    },
    {
      name: "📋 Ta mission",
      value: "> Explorer les zones délimitées par nos équipes.\n> Capturer, observer, documenter.\n> Défendre le Centre quand les Pokémon enragés franchissent notre périmètre — **et ils le feront.**",
    },
    {
      name: "​",
      value: "*Ce que tu vas découvrir ici pourrait changer le monde.\nOu du moins, lui éviter de finir consumé par sa propre arrogance.*",
    }
  )
  .setFooter({
    text: "— Professeure LYRA VOSS, Directrice scientifique, Centre AURORA\nTransmission terminée.",
  })
  .setTimestamp();

broadcastEmbed(embed, "src/scripts/announcements/send-lore-new-adventure.ts", { channelField: "lore" });
