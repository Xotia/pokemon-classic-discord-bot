import { EmbedBuilder } from "discord.js";

export async function helpCommand(interaction: any) {

    await interaction.deferReply();
    const helpEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Aide - Commandes Disponibles')
        .setDescription('Voici les commandes que vous pouvez utiliser avec le bot Creatures Hoarder (Bot Pokémon) :')
        .addFields(
            { name: '/ping', value: 'Vérifie si le bot est en ligne.' },
            { name: '/capture', value: 'Attrape un Pokémon, la zone de recherche et la génération sont des paramètres facultatifs.' },
            { name: '/capture-cible', value: 'Cible une zone et une rareté précises en échange de données de recherche.' },
            { name: '/get-pokemon-info', value: 'Affiche les infos complètes d\'un Pokémon : rareté, types, faiblesses en défense et statistiques.' },
            { name: '/pokedex', value: 'Affiche la liste des pokemons capturés avec /capture.' },
            { name: '/leaderboard', value: 'Affiche le classement des joueurs' },
            { name: '/cheat', value: 'Commande de triche à utiliser à vos risques et périls.' },
            { name: '/get-shiny-rate', value: 'Affiche le taux d\'apparition des pokemon shinys.' },
            { name: '/pity', value: 'Affiche l\'état du compteur de pity.' },
            { name: '/get-rarity', value: 'Affiche les taux de rareté des Pokémon.' },
            { name: '/raid', value: 'Inscris un de tes Pokémon pour défendre le centre de recherche lors du raid quotidien.' },
            { name: '/raid-squad', value: 'Affiche les infos du raid et la composition actuel de l\'équipe de défense.' },
        )
        .setFooter({ text: 'Amusez-vous bien avec Creatures Hoarder (Bot Pokémon) !' });
    return interaction.editReply({ embeds: [helpEmbed] });
}