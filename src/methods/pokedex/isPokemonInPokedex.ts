import { getPokemonName } from "../pokemon/getPokemonName";
import { Player } from "../../types/Player";

import { getLoggerForGuild } from "../../utils/logger";

export function isPokemonInPokedex(guildId: string, playerData: Player, pokemonId: number, userId: string): boolean {
    const logger = getLoggerForGuild(guildId);
    const pokemonName = getPokemonName(guildId, pokemonId);
    const trainerName = playerData ? playerData.name : "Inconnu";

    if (!playerData) {
        logger.info(`Joueur avec l'ID ${userId} non trouvé.`);
        return false;
    }

    logger.info(`Vérification si le pokémon ${pokemonName} (ID: ${pokemonId}) est déjà dans le pokédex de ${trainerName}...`);

    if (playerData.captureList?.[pokemonId]) {
        logger.info(`✅ ${pokemonName} (ID: ${pokemonId}) trouvé dans pokédex de ${trainerName} → total:${playerData.captureList[pokemonId].total} shiny:${playerData.captureList[pokemonId].shiny}`);
        return true;
    }

    logger.info(`➕ ${pokemonName} (ID: ${pokemonId}) NOUVEAU dans pokédex de ${trainerName}.`);
    return false;
}