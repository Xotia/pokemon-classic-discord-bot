import logger from "../../utils/logger";
export function resetPityCounterIfNeeded(player: any, rarity: string) {
    if (rarity === 'very_rare' || rarity === 'epic' || rarity === 'ultra_rare' || rarity === 'mythic' || rarity === 'legendary') {
        player.pityCounter = 0;
        logger.info(`Rareté ${rarity} obtenue, compteur de pity réinitialisé pour le joueur ${player.name}.`);
    }
}