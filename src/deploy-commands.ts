import { REST, Routes, SlashCommandBuilder } from "discord.js";
import "dotenv/config";
import logger from "./utils/logger";

const commands = [
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
    .setName("pokedex")
    .setDescription("Voir ton nombre de Pokémon capturés avec /capture.")
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
    .setName("pity")
    .setDescription("Affiche le statut du compteur de pity.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Affiche les statistiques du bot.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("get-rarity")
    .setDescription("Affiche les taux de rareté des Pokémon.")
    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    logger.info("Déploiement des commandes...");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.APPLICATION_ID!,
        process.env.GUILD_ID!,
      ),
      { body: commands },
    );
    logger.info("Commandes déployées.");
  } catch (error) {
    logger.info(`❌ Erreur : ${error}`);
    console.error(error);
  }
})();
