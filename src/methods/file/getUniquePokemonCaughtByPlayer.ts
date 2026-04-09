import { Player } from "../../types/Player";
import { getPlayer } from "../../utils/loadPlayer";
import logger from "../../utils/logger";
import { getUserIdFromUserName } from "./getUserIdFromUserName";

export function getUniquePokemonCaughtByPlayer(player: string): number {
    try {
        const userId = getUserIdFromUserName(player);
        const data = getPlayer(userId.toString()) as Player | null;
        if (!data || Object.keys(data.captureList).length === 0) {
            logger.info(`Le joueur ${userId} n'a encore capturé aucun Pokémon.`);
            return 0;
        }

        const uniqueCount = Object.keys(data.captureList).length;
        return uniqueCount;
    }
    catch (error) {
        throw new Error(`getUniquePokemonCaughtByPlayer échoué: ${(error as Error).message}`);
    }
}