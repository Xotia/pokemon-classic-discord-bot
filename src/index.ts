import 'dotenv/config';

import { loadPokemon } from './utils/loadData';

import { Client, GatewayIntentBits, Events, EmbedBuilder } from 'discord.js';

import { pingCommand } from './commands/ping';
import { cheatCommand } from './commands/cheat';
import { getRandomPokemon } from './methods/pokemon/getRandomPokemon';
import { isPokemonInRandomPokedex } from './methods/pokedex/isPokemonInRandomPokedex';
import { editFooter } from './methods/embed/editFooter';
import { checkIfUserCanCatch } from './methods/cooldown/checkIfUserCanCatch';
import { randomPokedexCommand } from './commands/random-pokedex';
import { displayPokemonInLogs } from './methods/console-logs/displayPokemonInLog';
import { isTheRandomPokemonGonnaBeShiny } from './methods/pokemon/isTheRandomPokemonGonnaBeShiny';
import { displayShinyInLogs } from './methods/console-logs/displayShinyInLogs';
import { displaySpriteInLogs } from './methods/console-logs/displaySpriteInLogs';
import { getPokemonSpriteUrl } from './methods/pokemon/getPokemonSpriteUrl';
import { displayInLogsIfPokemonAddedToPokedex } from './methods/console-logs/displayInLogsIfPokemonAddedToPokedex';
import { buildEmbed } from './methods/embed/buildEmbed';
import { buildTitleForRandomCaptureEmbed } from './methods/embed/buildTitleForRandomCaptureEmbed';
import { buildDescriptionForPokemonCaptureEmbed } from './methods/embed/buildDescriptionForRandomCaptureEmbed';
import { defineRarityColor } from './methods/pokemon/defineRarityColor';
import { createProfileIfNeeded } from './methods/file/createProfileIfNeeded';
import logger from './utils/logger';
import { addPokemonInRandomTotalCaptures } from './methods/stats/random/addPokemonInRandomTotalCaptures';
import { addPokemonInPlayerRandomTotalCaptures } from './methods/stats/random/addPokemonInPlayerRandomTotalCaptures';
import { addPokemonInRandomTotalPokemonCaptures } from './methods/stats/random/addPokemonInRandomTotalPokemonCaptures';
import { addShinyInTotalRandomShinyCaptures } from './methods/stats/random/addShinyInTotalRandomShinyCaptures';
import { addRandomShinyCaptureForPlayer } from './methods/stats/random/addRandomShinyCaptureForPlayer';
import { getPlayer } from './utils/loadPlayer';
import { addRandomCaptureToPlayer } from './methods/pokedex/addRandomCaptureToPlayer';
import { savePlayerData } from './methods/file/savePlayerData';
import { getPlayerAvatar } from './utils/getPlayerAvatar';
import { execute } from './commands/randomStatsCommand';

const pokemonList = loadPokemon();
const catchCooldown = new Map();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Event ready
client.once(Events.ClientReady, (c: typeof client) => {
    logger.info(`Bot connecté ! Connecté en tant que ${c.user?.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand() || !interaction.user?.id) {
        console.warn('❌ Interaction invalide:', !!interaction.user?.id);
        return;
    }

    if (!interaction.user) {
        logger.info(`❌ Interaction sans user`);
        console.error('❌ Interaction sans user');
        return;
    }

    if (!interaction.user.globalName) {
        console.warn('⚠️ User sans globalName, utilise username:', {
            id: interaction.user.id,
            username: interaction.user.username,
            hasGlobalName: !!interaction.user.globalName
        });
    }

    logger.info({
        event: "interaction_received",
        message: "➡️ Interaction reçue",
        id: interaction.id,
        type: interaction.type,
        isCommand: interaction.isChatInputCommand(),
        commandName: interaction.commandName
    });

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        return pingCommand(interaction);
    }

    if (interaction.commandName === 'cheat') {
        return cheatCommand(interaction);
    }

    if (interaction.commandName === 'random-pokedex') {
        await interaction.deferReply();
        return await randomPokedexCommand(interaction);
    }

    if (interaction.commandName === 'random-stats') {
        return await execute(interaction);
    }

    if (interaction.commandName === 'get-shiny-rate') {
        return interaction.reply('Le taux d\'apparition des Pokémon shinys est de 1 chance sur ' + process.env.SHINY_RATE);
    }

    if (interaction.commandName === 'random-capture') {
        await interaction.deferReply();

        //vérifier le cooldown
        const canCatch = await checkIfUserCanCatch(interaction, catchCooldown);
        if (!canCatch) {
            // la réponse a déjà été envoyée via editReply dans displayCannotCatchMessage
            return;
        }

        createProfileIfNeeded(interaction);
        const player = getPlayer(interaction.user.id);
        if (!player){
            logger.info(`Joueur avec l'ID ${interaction.user.id} non trouvé.`);
            return false;
        }

        getPlayerAvatar(interaction, 128);

        const random = getRandomPokemon(pokemonList);
        displayPokemonInLogs(interaction, random);
        console.log(`Le Pokémon capturé est ${random.name} (ID: ${random.id})`);

        const isShiny = isTheRandomPokemonGonnaBeShiny();
        displayShinyInLogs(isShiny, random);
        
        const spriteUrl = getPokemonSpriteUrl(isShiny, random);
        displaySpriteInLogs(interaction, spriteUrl);

        const isInPokedex = isPokemonInRandomPokedex(player, random.id, interaction.user.id);
        displayInLogsIfPokemonAddedToPokedex(interaction, !isInPokedex, random);

        //Statistiques
        await addPokemonInRandomTotalCaptures();
        await addPokemonInPlayerRandomTotalCaptures(interaction.user.globalName || interaction.user.username);
        await addPokemonInRandomTotalPokemonCaptures(random.name);
        if (isShiny) {
            await addShinyInTotalRandomShinyCaptures();
            await addRandomShinyCaptureForPlayer(interaction.user.globalName || interaction.user.username);
        }
        addRandomCaptureToPlayer(player, random.id, isShiny);
        savePlayerData(interaction, player);


        const color = defineRarityColor(random.catchRateRaw, isShiny);
        const title = buildTitleForRandomCaptureEmbed(isShiny, random, color);
        const description = buildDescriptionForPokemonCaptureEmbed(interaction, random, isShiny, !isInPokedex);
        logger.info("isInPokedex = " + isInPokedex);
        const footer = editFooter(interaction, random.name, isInPokedex);
        logger.info({
            event: "footer_message",
            message: "Le message du Footer sera",
            content: footer
        });

        const embed = buildEmbed(title, spriteUrl, color.color, description, footer);

        return interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'help') {
        await interaction.deferReply();
        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Aide - Commandes Disponibles')
            .setDescription('Voici les commandes que vous pouvez utiliser avec le bot Creatures Hoarder (Bot Pokémon) :')
            .addFields(
                { name: '/ping', value: 'Vérifie si le bot est en ligne.' },
                { name: '/random-capture', value: 'Attrape un Pokémon aléatoire.' },
                { name: '/random-pokedex', value: 'Affiche la liste des pokemons capturés avec /random-capture (à ne pas confondre avec le pokedex classique).' },
                { name: '/cheat', value: 'Commande de triche à utiliser à vos risques et périls.' },
                { name: '/get-shiny-rate', value: 'Affiche le taux d\'apparition des pokemon shinys.' }
            )
            .setFooter({ text: 'Amusez-vous bien avec Creatures Hoarder (Bot Pokémon) !' });
        return interaction.editReply({ embeds: [helpEmbed] });
    }

});
