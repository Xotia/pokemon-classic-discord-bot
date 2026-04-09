import logger from "../../utils/logger";

export function displayRarityInLogs(rarity: string){
    logger.info(`Rareté du Pokémon capturé : ${rarity}`);
}