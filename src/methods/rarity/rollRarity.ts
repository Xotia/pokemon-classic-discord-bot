import { Rarity, rarityList, rarityBoostedList } from "../../config/rarity";
import logger from '../../utils/logger';

export function rollRarity(pityTime: boolean): Rarity {

    let rarityListToUse;

    if(pityTime){
        logger.info('Pity time activé, utilisation de la liste de raretés boostées');
        rarityListToUse = rarityBoostedList;
    } else {
        rarityListToUse = rarityList;
    }
    const totalWeight = rarityListToUse.reduce((sum, r) => sum + r.weight, 0);
    logger.info(`Total weight for rarity roll: ${totalWeight}`);
    const rand = Math.random() * totalWeight;
    logger.info(`Random number for rarity roll: ${rand.toFixed(2)}`);

    let cumulative = 0;
    for (const { rarity, weight } of rarityListToUse) {
        cumulative += weight;
        logger.info(`Checking rarity: ${rarity} (weight: ${weight}, cumulative: ${cumulative.toFixed(2)})`);
        if (rand <= cumulative){
            logger.info(`Rareté obtenue : ${rarity} (rand: ${rand.toFixed(2)}, cumulative: ${cumulative.toFixed(2)})`);
            return rarity;
        } else {
            logger.info(`Rareté ${rarity} non sélectionnée (rand: ${rand.toFixed(2)}, cumulative: ${cumulative.toFixed(2)})`);
        }
    }
    return 'common';
}