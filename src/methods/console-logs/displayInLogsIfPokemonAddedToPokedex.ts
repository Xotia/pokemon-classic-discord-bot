import logger from '../../utils/logger';

export function displayInLogsIfPokemonAddedToPokedex(interaction: any, isAdded: boolean, random: { id: number; name: string; rarity: string; image: string; shinyImage: string; }) {
    const trainerName = interaction.user.globalName 
    ?? interaction.user.username 
    ?? 'Inconnu';

    const message = isAdded 
    ? `${random.name} a été ajouté au pokédex de ${trainerName}.` //Si isAdded est true alors le pokemon est nouveau dans le pokedex
    : `${random.name} était déjà dans le pokédex de ${trainerName}.`; //Si isAdded est false alors le pokemon est déjà dans le pokedex

    logger.info(message);
}