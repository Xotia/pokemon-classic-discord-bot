//Verifier si le pokemon est déjà dans le pokedex du joueur

import { getPokemonName } from "../pokemon/getPokemonName";
import { Player } from "../../types/Player";

export function verifyIfPokemonIsInPokedex(playerData: Player, pokemonId: number, userId: string): boolean {
    const pokemonName = getPokemonName(pokemonId);
    const trainerName = playerData ? playerData.name : "Inconnu";
    
    if (!playerData) {
        console.log(`Joueur avec l'ID ${userId} non trouvé.`);
        return false;
    }
    
    console.log(`Vérification si le pokémon ${pokemonName} (ID: ${pokemonId}) est déjà dans le pokédex de ${trainerName}...`);
    console.log(`Données du joueur :`, playerData);
    
    if (playerData.randomCaptures && playerData.randomCaptures.includes(pokemonId)) {
        console.log(`Le pokémon ${pokemonName} (ID: ${pokemonId}) est déjà dans le pokédex de ${trainerName}.`);
        return true;
    }
    
    console.log(`Le pokémon ${pokemonName} (ID: ${pokemonId}) n'est pas dans le pokédex de ${trainerName}.`);
    return false;
}