import { getLoggerForGuild } from "../../utils/logger";
export function resetPityCounterIfNeeded(guildId: string, player: any, rarity: string) {
    if (rarity === 'very_rare' || rarity === 'epic' || rarity === 'ultra_rare' || rarity === 'mythic' || rarity === 'legendary' || rarity === 'legendary_wandering') {
        player.pityCounter = 0;
        getLoggerForGuild(guildId).info(`Rareté ${rarity} obtenue, compteur de pity réinitialisé pour le joueur ${player.name}.`);
    }
}