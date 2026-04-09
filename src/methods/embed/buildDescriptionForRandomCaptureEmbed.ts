export function buildDescriptionForPokemonCaptureEmbed(interaction: any, pokemon: { id: number; name: string; rarity: string; image: string; shinyImage: string; }, isShiny: boolean, isAdded: boolean) {

    const trainerName = interaction.user.globalName || interaction.user.username;
    const catchMessage = isShiny
        ? `🎉 ${trainerName} a capturé un **${pokemon.name}** shiny !`
        : `${trainerName} a capturé un **${pokemon.name}** !`;
    const firstTImeMessage = isAdded
        ? `C'est la première fois que ${trainerName} capture un **${pokemon.name}** !`
        : '';
    const description = [catchMessage, firstTImeMessage].filter(Boolean).join('\n\n');
    return description;
}