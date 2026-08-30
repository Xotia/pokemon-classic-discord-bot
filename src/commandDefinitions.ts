import { SlashCommandBuilder } from "discord.js";
import { rarityList } from "./config/rarity";
import { TARGETABLE_RARITIES } from "./config/researchCost";

export const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Répond avec Pong !")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("cheat")
    .setDescription("Simule une capture pour un joueur")
    .addStringOption((option) =>
      option
        .setName("player")
        .setDescription("Nom du joueur")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("pokemon")
        .setDescription("Nom du Pokémon")
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName("shiny")
        .setDescription("Le Pokémon est-il shiny ?")
        .setRequired(true),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("raid-force-end")
    .setDescription("[Admin] Force la clôture et la résolution immédiate du raid en cours.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("raid-force-start")
    .setDescription("[Admin] Lance immédiatement un raid, avec génération et type de zone au choix.")
    .addIntegerOption((option) =>
      option
        .setName("generation")
        .setDescription("Génération du raid (aléatoire si omis)")
        .setRequired(false)
        .addChoices(
          { name: "Kanto (Generation 1)", value: 1 },
          { name: "Johto (Generation 2)", value: 2 },
          { name: "Hoenn (Generation 3)", value: 3 },
        ),
    )
    .addBooleanOption((option) =>
      option
        .setName("nouvelle-zone")
        .setDescription("true = prochaine zone à débloquer, false = zone déjà débloquée (tirage normal si omis)")
        .setRequired(false),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("world-boss-force-end")
    .setDescription("[Admin] Force la clôture et la résolution immédiate du world boss en cours.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("world-boss-force-start")
    .setDescription("[Admin] Ouvre immédiatement un world boss, avec boss et difficulté au choix.")
    .addStringOption((option) =>
      option
        .setName("boss")
        .setDescription("Boss à invoquer parmi ceux jamais vaincus (tirage aléatoire si omis)")
        .setRequired(false)
        .setAutocomplete(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("difficulte")
        .setDescription("Multiplicateur de statistiques (participants du précédent si omis)")
        .setRequired(false)
        .setMinValue(1),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("pokedex")
    .setDescription("Voir ton nombre de Pokémon capturés avec /capture.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("zone-progression")
    .setDescription("Affiche ton pourcentage de Pokémon capturés dans une zone.")
    .addStringOption((option) =>
      option
        .setName("zone")
        .setDescription("Zone à consulter")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("get-shiny-rate")
    .setDescription("Affiche le taux d'apparition des Pokémon shinys.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Affiche la liste des commandes disponibles.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("capture")
    .setDescription(
      "Capture d'un Pokémon aléatoire avec un système de rareté inspiré d'un gatcha.",
    )
    .addStringOption((option) =>
      option
        .setName("generation")
        .setDescription("Choisis la génération à capturer")
        .setRequired(false)
        .addChoices(
          { name: "Kanto (Generation 1)", value: "gen1" },
          { name: "Johto (Generation 2)", value: "gen2" },
          { name: "Hoenn (Generation 3)", value: "gen3" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("zone")
        .setDescription("Choisis la zone de capture")
        .setRequired(false)
        .setAutocomplete(true),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("capture-cible")
    .setDescription(
      "Capture garantie d'un Pokémon d'une rareté précise dans une zone, contre des données de recherche.",
    )
    .addStringOption((option) =>
      option
        .setName("zone")
        .setDescription("Choisis la zone de capture")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("rarity")
        .setDescription("Choisis la rareté du Pokémon à capturer")
        .setRequired(true)
        .addChoices(
          ...TARGETABLE_RARITIES.map((rarity) => ({
            name: rarityList.find((r) => r.rarity === rarity)!.french,
            value: rarity,
          })),
        ),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("raid")
    .setDescription(
      "Participe au raid et tente de défendre le centre de recherche du pokémon enragé !",
    )
    .addStringOption((option) =>
      option
        .setName("pokemon_name")
        .setDescription("Choisis le pokemon avec lequel tu souhaites participer au raid")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Choisis le type d'attaque que ton pokémon utilisera")
        .setRequired(false)
        .setAutocomplete(true),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("world-boss")
    .setDescription(
      "Franchis le portail et affronte le world boss de la semaine avec les dresseurs du monde entier !",
    )
    .addStringOption((option) =>
      option
        .setName("pokemon_name")
        .setDescription("Choisis le pokemon avec lequel tu souhaites participer au world boss")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Choisis le type d'attaque que ton pokémon utilisera")
        .setRequired(false)
        .setAutocomplete(true),
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("world-boss-squad")
    .setDescription("Affiche le world boss en cours et l'équipe mondiale, tous serveurs confondus.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("pity")
    .setDescription("Affiche le statut du compteur de pity.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Affiche le classement des joueurs.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("get-rarity")
    .setDescription("Affiche les taux de rareté des Pokémon.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("raid-squad")
    .setDescription("Affiche les infos du raid et la composition actuel de l'équipe de défense.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("get-pokemon-info")
    .setDescription("Affiche les informations détaillées d'un Pokémon ou d'un Gigamax.")
    .addStringOption((option) =>
      option
        .setName("pokemon")
        .setDescription("Nom du Pokémon ou du Gigamax")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .toJSON(),
];
