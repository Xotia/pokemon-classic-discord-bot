import { Player } from "../../types/Player";
import { getPlayer } from "../../utils/loadPlayer";
import logger from "../../utils/logger";
import { getTotalPokemonNumber } from "../pokedex/getTotalPokemonNumber";
import { getUserIdFromUserName } from "./getUserIdFromUserName";

export function getPlayerNumberThatStillNeedToBeCaptured(player: string): number {
    const userId = getUserIdFromUserName(player);
    console.log("getPlayerNumberThatStillNeedToBeCaptured pour userId:", userId);
    const data = getPlayer(userId.toString()) as Player | null;
    console.log("Données du joueur récupérées:", data);

    if (!data || Object.keys(data.captureList).length === 0) {
        logger.info(`Le joueur ${userId} n'a encore capturé aucun Pokémon.`);
        return 0;
    }

    try {
        const totalPokemonNumber = getTotalPokemonNumber();
        const uniqueCount = Object.keys(data.captureList).length;
        const pokemonNumberThatStillNeedToBeCaptured = totalPokemonNumber - uniqueCount;
        return pokemonNumberThatStillNeedToBeCaptured;
    } catch (error) {
        throw new Error(`getPlayerNumberThatStillNeedToBeCaptured échoué: ${(error as Error).message}`);
    }
}