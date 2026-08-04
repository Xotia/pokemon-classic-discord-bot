import { EmbedBuilder } from "discord.js";

const EMBED_COLOR = 0x4b0082;
const WARNING_COLOR = 0xff6600;

export function buildMeteoriteWarningEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(WARNING_COLOR)
    .setTitle("📡 AURORA — NOTE INTERNE — DIFFUSION RESTREINTE")
    .setDescription(
      [
        "```",
        "CONNEXION ÉTABLIE........... [INSTABLE]",
        "CHIFFREMENT : PARTIEL",
        "PERTE DE PAQUETS : 34%",
        "```",
        "",
        "**Dresseurs accrédités,**",
        "",
        "Ce message n'est pas un bulletin officiel.",
        "",
        "Quelque chose ne va pas. Depuis quelques heures, nos instruments enregistrent des valeurs que nous ne savons pas interpréter. Les boussoles dans le secteur nord ont perdu leur nord. Certains appareils se sont éteints seuls. D'autres affichent en boucle la même mesure — sans interruption, sans variation.",
        "",
        "Nos communications sont dégradées. Nous ne savons pas encore si c'est lié.",
        "",
        "Les Pokémon des zones périphériques ne se comportent plus normalement. **Ils regardent tous dans la même direction.**",
        "",
        "*Je n'ai pas encore d'explication. Restez à l'écoute.*",
      ].join("\n"),
    )
    .addFields({
      name: "​",
      value: "```\nTRANSMISSION INTERROMPUE\n```",
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
          "**Cratère de la Météorite** — la zone sera scellée dès que le rayonnement passera sous le seuil de sécurité.",
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
