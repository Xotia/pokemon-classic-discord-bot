import { PLAYERS_DB } from "../../config/paths";

export function getUserIdFromUserName(userName: string): string {
    try {
        const allPlayers = JSON.parse(require('fs').readFileSync(PLAYERS_DB, 'utf8'));
        for (const [userId, playerData] of Object.entries(allPlayers)) {
            if ((playerData as { name: string }).name.toLowerCase() === userName.toLowerCase()) {
                return userId;
            }
        }
        throw new Error(`Aucun utilisateur trouvé avec le nom "${userName}"`);
    } catch (error) {
        throw new Error(`getUserIdFromUserName échoué: ${(error as Error).message}`);
    }
} 