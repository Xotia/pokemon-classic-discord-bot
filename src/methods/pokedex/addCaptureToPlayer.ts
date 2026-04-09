import { Player } from '../../types/Player';
import logger from '../../utils/logger';

export function addCaptureToPlayer(player: Player, pokemonId: number, isShiny: boolean = false): void {
    if (!player.captureList[pokemonId]) {
        player.captureList[pokemonId] = { total: 0, shiny: 0 };
    }

    player.captureList[pokemonId].total += 1;
    if (isShiny) {
        player.captureList[pokemonId].shiny += 1;
    }

    logger.info(`${player.name} : Pokémon #${pokemonId} => total: ${player.captureList[pokemonId].total} shiny: ${player.captureList[pokemonId].shiny}`);
}