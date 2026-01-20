//Verifier si le pokemon est déjà dans le pokedex du joueur

import { getPokemonName } from "../pokemon/getPokemonName";
import { Player } from "../../types/Player";

import logger from "../../utils/logger";

export function isPokemonInRandomPokedex(playerData: Player, pokemonId: number, userId: string): boolean {
    const pokemonName = getPokemonName(pokemonId);
    const trainerName = playerData ? playerData.name : "Inconnu";

    if (!playerData) {
        logger.info(`Joueur avec l'ID ${userId} non trouvé.`);
        return false;
    }

    logger.info(`Vérification si le pokémon ${pokemonName} (ID: ${pokemonId}) est déjà dans le pokédex de ${trainerName}...`);

    if (playerData.randomCaptures[pokemonId]) {
        logger.info(`✅ ${pokemonName} (ID: ${pokemonId}) trouvé dans pokédex de ${trainerName} → total:${playerData.randomCaptures[pokemonId].total} shiny:${playerData.randomCaptures[pokemonId].shiny}`);
        return true;
    }

    logger.info(`➕ ${pokemonName} (ID: ${pokemonId}) NOUVEAU dans pokédex de ${trainerName}.`);
    return false;
}