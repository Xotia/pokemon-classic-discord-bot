import { EmbedBuilder } from "discord.js";

export async function helpCommand(interaction: any) {

    await interaction.deferReply();
    const helpEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Aide - Commandes Disponibles')
        .setDescription('Voici les commandes que vous pouvez utiliser avec le bot Creatures Hoarder (Bot Pokémon) :')
        .addFields(
            { name: '/ping', value: 'Vérifie si le bot est en ligne.' },
            { name: '/capture', value: 'Attrape un Pokémon aléatoire.' },
            { name: '/pokedex', value: 'Affiche la liste des pokemons capturés avec /capture (à ne pas confondre avec le pokedex classique).' },
            { name: '/stats', value: 'Affiche les statistiques du bot' },
            { name: '/cheat', value: 'Commande de triche à utiliser à vos risques et périls.' },
            { name: '/get-shiny-rate', value: 'Affiche le taux d\'apparition des pokemon shinys.' },
            { name: '/pity', value: 'Affiche l\'état du compteur de pity.' },
            { name: '/get-rarity', value: 'Affiche les taux de rareté des Pokémon.' },
        )
        .setFooter({ text: 'Amusez-vous bien avec Creatures Hoarder (Bot Pokémon) !' });
    return interaction.editReply({ embeds: [helpEmbed] });
}