import logger from '../../utils/logger';

export function displayPokemonInLogs(interaction: any, random: { id: number; name: string; rarity: string; image: string; shinyImage: string; }) {
    if (!random) {
        return interaction.editReply({ content: '❌ Erreur lors de la sélection du Pokémon.' });
    } else {
        logger.info({
            event: "pokemon_obtained",
            message: "Données du pokemon",
            random: {
                name: random.name,
                id: random.id
            }
        });

    }
}