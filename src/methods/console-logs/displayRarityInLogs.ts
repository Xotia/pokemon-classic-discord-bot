import { getLoggerForGuild } from "../../utils/logger";

export function displayRarityInLogs(guildId: string, rarity: string){
    getLoggerForGuild(guildId).info(`Rareté du Pokémon capturé : ${rarity}`);
}