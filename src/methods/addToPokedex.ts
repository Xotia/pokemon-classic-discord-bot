//Ajouter le pokemon rencontré au pokedex du joueur

export function addToPokedex(playerData: Record<string, { name: string; captures: number[] }>, pokemonId: number, userId: string): void {   
        playerData[userId].captures.push(pokemonId);
        console.log(`Le pokémon ${pokemonId} a été ajouté au pokédex de ${playerData[userId].name}.`);
}