export function displayInLogsIfPokemonAddedToPokedex(interaction: any, isAdded: boolean, random: { id: number; name: string; spawnRate: number; catchRateRaw: number; image: string; shinyImage: string; }) {
    const trainerName = interaction.user.globalName 
    ?? interaction.user.username 
    ?? 'Inconnu';  // ✅ Fallback final

    const message = isAdded 
    ? `${random.name} a été ajouté au pokédex de ${trainerName}.`
    : `${random.name} était déjà dans le pokédex de ${trainerName}.`;

    console.log(message);
}