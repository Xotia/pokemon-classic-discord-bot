import { EmbedBuilder } from "discord.js";

const HALLOWEEN_COLOR = 0xff7518;

export function buildHalloweenWarningEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(HALLOWEEN_COLOR)
    .setTitle("🕯️ Une lumière s'est allumée au Manoir")
    .setDescription(
      [
        "**Dresseurs,**",
        "",
        "Depuis la colline, on aperçoit une lueur dans les fenêtres du vieux manoir abandonné. Les volets claquent sans vent. Les Pokémon du coin refusent de s'en approcher.",
        "",
        "D'anciens rapports indiquent que les portes ne s'ouvrent qu'un jour par an.",
        "",
        "***Demain, elles s'ouvriront.***",
      ].join("\n"),
    )
    .addFields({
      name: "​",
      value: "*Préparez vos Pokéballs. Et peut-être une lampe.*",
    })
    .setTimestamp();
}

export function buildHalloweenStartEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(HALLOWEEN_COLOR)
    .setTitle("🎃 Le Manoir hanté est ouvert")
    .setDescription(
      [
        "**Dresseurs,**",
        "",
        "Les grilles ont cédé à minuit. Le Manoir hanté vous attend jusqu'à 23h59 ce soir, pas une minute de plus.",
        "",
        "Des Pokémon spectres et ténèbres rôdent dans les couloirs, et d'autres, venus de régions lointaines, se sont glissés à l'intérieur. Demain, ils auront disparu.",
        "",
        "*Des petits rires malicieux résonnent dans les couloirs. Amusés, espiègles… et un peu trop proches pour être rassurants.*",
      ].join("\n"),
    )
    .addFields(
      {
        name: "🕸️ Conditions dans le Manoir",
        value:
          "> Cooldown de capture divisé par deux.\n> XP doublée.\n> Chances de chromatique triplées.",
      },
      {
        name: "🎃 Citrouilles",
        value:
          "À chaque capture dans le Manoir, 15 % de chances de trouver une citrouille. Elles rapportent des points.",
      },
      {
        name: "🏆 Concours de capture",
        value:
          "Un gagnant par serveur, récompensé par une capture ciblée mythique. Détails avec `/concours`.",
      },
      {
        name: "👻 World Boss",
        value:
          "À la nuit tombée, quelque chose d'immense se réveillera dans le Manoir. Inscriptions de 18h à 23h avec `/world-boss`, tous serveurs confondus.",
      },
      {
        name: "🌑 Raid du jour",
        value:
          "Le raid d'aujourd'hui ne ressemblera à aucun autre. Au créneau habituel des raids, inscrivez-vous avec `/raid`… si vous l'osez.",
      },
      {
        name: "📍 Pour entrer",
        value: "`/capture zone:Manoir hanté`",
      },
    )
    .setTimestamp();
}

/**
 * Embed de fin. `results` est une section optionnelle (par exemple les
 * gagnants du concours) ajoutée sous le texte de clôture.
 */
export function buildHalloweenEndEmbed(results?: { title: string; value: string }): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(HALLOWEEN_COLOR)
    .setTitle("🌑 Les portes du Manoir se referment")
    .setDescription(
      [
        "**Dresseurs,**",
        "",
        "Minuit a sonné. Les lumières du manoir se sont éteintes une à une, et les grilles se sont refermées d'elles-mêmes.",
        "",
        "Les spectres sont retournés à leurs ombres, les visiteurs d'ailleurs ont repris la route. Il ne reste que quelques citrouilles oubliées sur le perron.",
        "",
        "*À l'année prochaine, peut-être.*",
      ].join("\n"),
    );

  if (results) embed.addFields({ name: results.title, value: results.value });

  return embed.setTimestamp();
}
