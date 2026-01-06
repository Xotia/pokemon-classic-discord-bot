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
    .setName('capture')
    .setDescription('Capture un Pokémon sauvage.'),
    new SlashCommandBuilder()
  .setName('pokedex')
  .setDescription('Voir ton nombre de Pokémon capturés.')
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
