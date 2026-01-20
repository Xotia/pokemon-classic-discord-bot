import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';
import logger from './utils/logger';

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Répond avec Pong !')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('cheat')
    .setDescription('Triche pour obtenir des Pokémon rapidement.'),
  new SlashCommandBuilder()
    .setName('random-capture')
    .setDescription('Capture un Pokémon sauvage aléatoire.'),
  new SlashCommandBuilder()
    .setName('random-pokedex')
    .setDescription('Voir ton nombre de Pokémon capturés avec /random-capture.'),
  new SlashCommandBuilder()
    .setName('get-shiny-rate')
    .setDescription('Affiche le taux d\'apparition des Pokémon shinys.'),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche la liste des commandes disponibles.'),
  new SlashCommandBuilder()
    .setName('random-stats')
    .setDescription('Affiche les statistiques du bot.')
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    logger.info('Déploiement des commandes...');
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.APPLICATION_ID!,
        process.env.GUILD_ID!
      ),
      { body: commands },
    );
    logger.info('Commandes déployées.');
  } catch (error) {
    logger.info(`❌ Erreur : ${error}`);
    console.error(error);
  }
})();
