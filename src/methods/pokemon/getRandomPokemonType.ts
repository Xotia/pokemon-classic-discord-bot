import { Pokemon } from "../../types/Pokemon";
import { getRandomIntInclusive } from "../../utils/getRandomIntInclusive";
import { getLoggerForGuild } from "../../utils/logger";

export function getRandomPokemonType(guildId: string, pokemonWeNeedRandomStat: Pokemon | undefined) {
    if (!pokemonWeNeedRandomStat) {
        getLoggerForGuild(guildId).info(`Pokemon undefined`);
        return null;
    }
    const types = pokemonWeNeedRandomStat.types;
    const randomNumber = getRandomIntInclusive(0, types.length);
    const randomType = types[randomNumber];
    return randomType;
}
