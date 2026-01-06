import 'dotenv/config';
import { Client, GatewayIntentBits, Events, EmbedBuilder, CacheType, ChatInputCommandInteraction } from 'discord.js';

import pokemonGen1 from '../data/pokemon-gen1.json';

import { pingCommand } from './commands/ping';
import { cheatCommand } from './commands/cheat';
import { getRandomPokemon } from './methods/getRandomPokemon';
import { displaySuccessCapture } from './methods/displaySuccessCapture';
import { addPokemonToPokedexIfNew } from './methods/addPokemonToPokedexIfNew';
import { editFooter } from './methods/editFooter';
import { displayPokedex } from './methods/displayPokedex';
import { checkIfUserCanCatch } from './methods/checkIfUserCanCatch';

const catchCooldown = new Map(); // userId -> timestamp
// const CATCH_COOLDOWN_MS = 30 * 60 * 1000
// const CATCH_COOLDOWN_MS = 10 * 1000;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Event ready
client.once(Events.ClientReady, (c: typeof client) => {
    console.log(`Bot connecté ! Connecté en tant que ${c.user?.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

client.on(Events.InteractionCreate, async (interaction) => {
    console.log('➡️ Interaction reçue:', {
        id: interaction.id,
        type: interaction.type,
        isCommand: interaction.isChatInputCommand(),
        commandName: interaction.isChatInputCommand() ? interaction.commandName : null,
    });

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        pingCommand(interaction);
    }

    if (interaction.commandName === 'cheat') {
        cheatCommand(interaction);
    }

    if (interaction.commandName === 'pokedex') {
        await interaction.deferReply();
        const embed = displayPokedex(interaction);
        return interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'capture') {
        await interaction.deferReply();

        //vérifier le cooldown
        const canCatch = await checkIfUserCanCatch(interaction, catchCooldown);
        if (!canCatch) {
            // la réponse a déjà été envoyée via editReply dans displayCannotCatchMessage
            return;
        }

        const random = getRandomPokemon(pokemonGen1);
        if (!random) {
            return interaction.editReply({ content: '❌ Erreur lors de la sélection du Pokémon.' });
        } else {
            console.log('Pokémon obtenu:', random);
            console.log("L'id du Pokémon est :", random.id);
        }

        const SHINY_RATE = 1 / 512;
        const isShiny = Math.random() < SHINY_RATE;
        if (!isShiny) {
            console.log(random.name + " n'est pas shiny.");
        } else {
            console.log(random.name + " est shiny.");
        }

        const spriteUrl = isShiny ? random.shinyImage : random.image;
        if (!spriteUrl) {
            return interaction.editReply({ content: '❌ Erreur lors de la récupération du sprite du pokemon' });
        }

        const isAdded = addPokemonToPokedexIfNew(interaction, random.id);
        if (isAdded) {
            console.log(`${random.name} a été ajouté au pokédex de ${interaction.user.globalName}.`);
        }else{
            console.log(`${random.name} était déjà dans le pokédex de ${interaction.user.globalName}.`);
        }

        const footer = editFooter(interaction, random.name, !isAdded);
        console.log("Le Footer du message sera :", footer);
        const embed = new EmbedBuilder()
            .setTitle(
                isShiny
                    ? `✨ ${random.name} shiny sauvage apparaît !`
                    : `${random.name} sauvage apparaît !`
            )
            .setImage(spriteUrl)
            .setColor(isShiny ? 0xFFD700 : 0x0099FF)
            .setFooter({ text: footer });

        await displaySuccessCapture(interaction,  random, spriteUrl, embed, isShiny);
        return interaction.editReply({ embeds: [embed] });
    }

});
