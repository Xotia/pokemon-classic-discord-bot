//Verifier si le pokemon est déjà dans le pokedex du joueur

import { getPokemonName } from "./getPokemonName";

export function verifyIfPokemonIsOnPokedex(playerData: Record<string, { name: string, captures: number[] }>, pokemonId: number, userId: string): boolean {
    const pokemonName = getPokemonName(pokemonId);
    const player = playerData[userId];
    const trainerName = player ? player.name : "Inconnu";
    
    if (!player) {
        console.log(`Joueur avec l'ID ${userId} non trouvé.`);
        return false;
    }
    
    console.log(`Vérification si le pokémon ${pokemonName} (ID: ${pokemonId}) est déjà dans le pokédex de ${trainerName}...`);
    
    if (player.captures.includes(pokemonId)) {
        console.log(`Le pokémon ${pokemonName} (ID: ${pokemonId}) est déjà dans le pokédex de ${trainerName}.`);
        return true;
    }
    
    console.log(`Le pokémon ${pokemonName} (ID: ${pokemonId}) n'est pas dans le pokédex de ${trainerName}.`);
    return false;
}