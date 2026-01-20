import logger from '../../utils/logger';

export function displayShinyInLogs(isShiny: boolean, random: { id: number; name: string; spawnRate: number; catchRateRaw: number; image: string; shinyImage: string; }) {
    if (!isShiny) {
        logger.info(random.name + " n'est pas shiny.");
    } else {
        logger.info(random.name + " est shiny.");
    }
}