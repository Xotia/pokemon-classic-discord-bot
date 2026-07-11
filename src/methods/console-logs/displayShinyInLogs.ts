import { getLoggerForGuild } from '../../utils/logger';

export function displayShinyInLogs(guildId: string, isShiny: boolean, random: { id: number; name: string; rarity: string; image: string; shinyImage: string; }) {
    const logger = getLoggerForGuild(guildId);
    if (!isShiny) {
        logger.info(random.name + " n'est pas shiny.");
    } else {
        logger.info(random.name + " est shiny.");
    }
}