import logger from '../../utils/logger';

export function isThePokemonGonnaBeShiny(): boolean {
    const shinyRateNumber = parseFloat(process.env.SHINY_RATE || '256');
    const randomValue = Math.random();
    const isShiny = randomValue < (1 / shinyRateNumber);
    logger.info('randomShinyValue = ' + randomValue + ' | isShiny = ' + isShiny);
    return isShiny;
}