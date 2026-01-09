export function displayInLogsIfPokemonAddedToPokedex(interaction: any, isAdded: boolean, random: { id: number; name: string; spawnRate: number; catchRateRaw: number; image: string; shinyImage: string; }) {
    if (isAdded) {
        console.log(`${random.name} a été ajouté au pokédex de ${interaction.user.globalName}.`);
    } else {
        console.log(`${random.name} était déjà dans le pokédex de ${interaction.user.globalName}.`);
    }
}