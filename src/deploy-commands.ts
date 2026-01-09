import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';

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
    .setDescription('Affiche la liste des commandes disponibles.')
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log('Déploiement des commandes...');
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.APPLICATION_ID!,
        process.env.GUILD_ID!
      ),
      { body: commands },
    );
    console.log('Commandes déployées.');
  } catch (error) {
    console.error(error);
  }
})();
