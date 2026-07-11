import { getLoggerForGuild } from '../../utils/logger';
import { getShinyRate } from '../../config/guildSettings';

export function isThePokemonGonnaBeShiny(guildId: string): boolean {
    const shinyRateNumber = getShinyRate(guildId);
    const randomValue = Math.random();
    const isShiny = randomValue < (1 / shinyRateNumber);
    getLoggerForGuild(guildId).info('randomShinyValue = ' + randomValue + ' | isShiny = ' + isShiny);
    return isShiny;
}