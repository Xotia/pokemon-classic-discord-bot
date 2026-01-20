import { Player } from '../../types/Player';
import logger from '../../utils/logger';

export function addRandomCaptureToPlayer(player: Player, pokemonId: number, isShiny: boolean = false): void {
    if (!player.randomCaptures[pokemonId]) {
        player.randomCaptures[pokemonId] = { total: 0, shiny: 0 };
    }

    player.randomCaptures[pokemonId].total += 1;
    if (isShiny) {
        player.randomCaptures[pokemonId].shiny += 1;
    }

    logger.info(`${player.name} : Pokémon #${pokemonId} => total: ${player.randomCaptures[pokemonId].total} shiny: ${player.randomCaptures[pokemonId].shiny}`);
}