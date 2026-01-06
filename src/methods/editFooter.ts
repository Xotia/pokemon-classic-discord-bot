export function editFooter(interaction: any, pokemonName: string, isPokemonOnPokedex: boolean): string {
    const userName = interaction.user.globalName || interaction.user.username;
    let messageFooter = '';
    if (isPokemonOnPokedex) {
        messageFooter = `${pokemonName} est déjà dans le pokédex de ${userName}.`;
    } else {
        messageFooter = `${pokemonName} a été ajouté au pokédex de ${userName} !`;
    }
    return messageFooter;
}