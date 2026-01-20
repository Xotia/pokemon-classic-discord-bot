import { loadPlayers } from "../../utils/loadData";
import logger from "../../utils/logger";

export function verifyIfPlayerExist(userId: number): boolean {
    const players = loadPlayers();
    if (!players[userId]) {
        logger.info(`Joueur avec l'ID ${userId} non trouvé.`);
        return false;
    }
    return true;
}