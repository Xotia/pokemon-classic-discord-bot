import { Pokemon } from "../../types/Pokemon";
import { getRandomIntInclusive } from "../../utils/getRandomIntInclusive";
import logger from "../../utils/logger";

export function getRandomPokemonType(pokemonWeNeedRandomStat: Pokemon | undefined) {
    if (!pokemonWeNeedRandomStat) {
        logger.info(`Pokemon undefined`);
        return null;
    }
    const types = pokemonWeNeedRandomStat.types;
    const randomNumber = getRandomIntInclusive(0, types.length);
    const randomType = types[randomNumber];
    return randomType;
}
