import { getLoggerForGuild } from '../../utils/logger';
import { getShinyRate } from '../../config/guildSettings';
import { getEventShinyRateFactor } from '../../features/events/eventZones';

export function isThePokemonGonnaBeShiny(guildId: string, zone?: string): boolean {
    const shinyRateNumber = getShinyRate(guildId);
    const randomValue = Math.random();
    const isShiny = randomValue < (getEventShinyRateFactor(zone) / shinyRateNumber);
    getLoggerForGuild(guildId).info('randomShinyValue = ' + randomValue + ' | isShiny = ' + isShiny);
    return isShiny;
}