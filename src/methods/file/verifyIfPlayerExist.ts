import { loadPlayers } from "../../utils/loadData";

export function verifyIfPlayerExist(userId: number): boolean {
    const players = loadPlayers();
    if (!players[userId]) {
        console.log(`Joueur avec l'ID ${userId} non trouvé.`);
        return false;
    }
    return true;
}