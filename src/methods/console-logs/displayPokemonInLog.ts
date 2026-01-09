export function displayPokemonInLogs(interaction: any, random: { id: number; name: string; spawnRate: number; catchRateRaw: number; image: string; shinyImage: string; }) {
    if (!random) {
        return interaction.editReply({ content: '❌ Erreur lors de la sélection du Pokémon.' });
    } else {
        console.log('Pokémon obtenu:', random);
        console.log("L'id du Pokémon est :", random.id);
    }
}