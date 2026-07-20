import { Player } from "../../types/Player";
import { getPlayer } from "../../utils/loadPlayer";
import { getLoggerForGuild } from "../../utils/logger";
import { getPlayerIdByName } from "./getPlayerIdByName";

export function getUniquePokemonCaughtByPlayer(guildId: string, player: string): number {
    const logger = getLoggerForGuild(guildId);
    try {
        const userId = getPlayerIdByName(guildId, player);
        if (!userId) {
            logger.info(`Joueur "${player}" introuvable.`);
            return 0;
        }
        const data = getPlayer(guildId, userId) as Player | null;
        if (!data || Object.keys(data.captureList ?? {}).length === 0) {
            logger.info(`Le joueur ${userId} n'a encore capturé aucun Pokémon.`);
            return 0;
        }

        const uniqueCount = Object.keys(data.captureList ?? {}).length;
        return uniqueCount;
    }
    catch (error) {
        throw new Error(`getUniquePokemonCaughtByPlayer échoué: ${(error as Error).message}`);
    }
}