import { EmbedBuilder } from "discord.js";

const EMBED_COLOR = 0x4b0082;
const WARNING_COLOR = 0xff6600;

export function buildMeteoriteWarningEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(WARNING_COLOR)
    .setTitle("⚠️ AURORA — BULLETIN D'ALERTE ORBITAL #47")
    .setDescription(
      [
        "**Dresseurs,**",
        "",
        "Nos équipes de veille astronomique ont été alertées par l'Agence Spatiale Internationale d'un incident survenu cette nuit en orbite basse.",
        "",
        "**Une météorite de taille intermédiaire a percuté un essaim de 17 satellites AstroX** en transit au-dessus de l'hémisphère nord. La collision a généré un important champ de débris. La flotte de satellites AstroX — propriété de l'entreprise privée *AstroX Dynamics* — a subi des dommages estimés à plusieurs dizaines d'unités.",
        "",
        "Ce qui nous préoccupe davantage : **les systèmes de suivi du Centre AURORA ont identifié un fragment de taille significative sur une trajectoire de rentrée atmosphérique**. Les calculs préliminaires indiquent une zone d'impact potentielle à proximité de notre secteur de recherche.",
        "",
        "***Impact estimé : dans 7 jours.***",
        "",
        "*La Professeure Voss tient à préciser que les risques directs pour la population sont jugés faibles à ce stade. Nos instruments continueront à affiner la trajectoire dans les prochaines heures. Des instructions supplémentaires seront communiquées en temps voulu.*",
      ].join("\n"),
    )
    .addFields({
      name: "📡 Suivi en cours",
      value:
        "Fragment désigné **AURORA-M1** — masse estimée : 800 à 1200 kg — composition : indéterminée.\nProchain bulletin dans 24h.",
    })
    .setFooter({
      text: "— Professeure LYRA VOSS, Directrice scientifique, Centre AURORA\nTransmission chiffrée — diffusion restreinte aux dresseurs accrédités",
    })
    .setTimestamp();
}

export function buildMeteoriteStartEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle("🌠 ALERTE AURORA — IMPACT DÉTECTÉ")
    .setDescription(
      [
        "**Dresseurs,**",
        "",
        "À 00h01 ce matin, nos capteurs sismiques ont enregistré un impact d'origine extraterrestre à 3,2 kilomètres au nord-est du Centre AURORA.",
        "",
        "Un corps céleste — probablement une météorite de type M — s'est écrasé dans la zone 7-C, creusant un cratère de quarante mètres de diamètre. Les premières analyses spectrographiques indiquent une composition inconnue des instruments standards. La roche émet un rayonnement résiduel non identifié.",
        "",
        "***Ce qui est certain : les Pokémon autour du site se comportent différemment.***",
        "",
        "Certaines espèces habituellement absentes de nos registres locaux ont été observées aux abords du cratère depuis les premières heures. Attirées par le rayonnement, par la chaleur, ou par autre chose — nous ne savons pas encore.",
        "",
        "*Des phénomènes instables ont été captés à la périphérie du site. Leur nature reste à documenter.*",
      ].join("\n"),
    )
    .addFields(
      {
        name: "📍 Zone temporairement ouverte",
        value:
          "**Cratère de la Météorite** — accès autorisé jusqu'à 23h59 ce soir.\nLa zone sera scellée dès que le rayonnement passera sous le seuil de sécurité.",
      },
      {
        name: "⚡ Conditions de terrain",
        value:
          "> Cooldown de capture réduit de moitié dans la zone.\n> Gains d'XP et de données de recherche doublés.",
      },
      {
        name: "​",
        value:
          "*Les données collectées aujourd'hui alimenteront nos travaux en vue d'un prochain phénomène. Chaque capture compte.*",
      },
    )
    .setFooter({
      text: "— Professeure LYRA VOSS, Directrice scientifique, Centre AURORA",
    })
    .setTimestamp();
}

export function buildMeteoriteEndEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle("🌑 AURORA — ACCÈS AU CRATÈRE SUSPENDU")
    .setDescription(
      [
        "**Dresseurs,**",
        "",
        "À 23h59, les équipes de sécurité mandatées par des entités étroitement liées à *AstroX Dynamics* ont établi un périmètre d'exclusion autour du Cratère de la Météorite.",
        "",
        "L'accès à la zone est désormais interdit — aux humains comme aux Pokémon. Des barrières physiques et des dispositifs de surveillance ont été déployés en quelques heures, avec une efficacité qui laisse peu de doutes sur l'anticipation de cette opération.",
        "",
        "**Le Centre AURORA n'a pas été consulté.**",
        "",
        "Les raisons officielles invoquées sont vagues : *« sécurisation d'un site à risque »*, *« protocole d'intervention d'urgence »*. Nous savons ce que cela signifie réellement : le fragment AURORA-M1 contient quelque chose qu'ils souhaitent contrôler. Les données de composition, les relevés biologiques, les comportements Pokémon observés aujourd'hui — tout cela sera désormais filtré, ou enterré.",
        "",
        "*Ce que des corporations comme AstroX ne semblent jamais considérer, c'est l'impact sur les espèces qui vivaient autour de ce cratère. Les Pokémon attirés par le rayonnement n'ont nulle part où aller. Le périmètre ne distingue pas un intrus humain d'un Noctali cherchant un abri. Cette indifférence à la biodiversité n'est pas un accident — c'est une habitude.*",
      ].join("\n"),
    )
    .addFields(
      {
        name: "📁 Ce que vous avez sauvé",
        value:
          "Les données collectées par les dresseurs accrédités AURORA **sont entre nos mains**. Elles ne seront pas transmises aux partenaires commerciaux d'AstroX. Leur analyse est en cours.",
      },
      {
        name: "​",
        value:
          "*Ce n'est pas terminé. Restez à l'écoute des transmissions AURORA.*",
      },
    )
    .setFooter({
      text: "— Professeure LYRA VOSS, Directrice scientifique, Centre AURORA\nTransmission chiffrée — diffusion restreinte aux dresseurs accrédités",
    })
    .setTimestamp();
}
