//Ajouter le pokemon rencontré au pokedex du joueur

export function addToPokedex(playerData: Record<string, { name: string; randomCaptures: number[] }>, pokemonId: number, userId: string): void {   
        playerData[userId].randomCaptures.push(pokemonId);
        console.log(`Le pokémon ${pokemonId} a été ajouté au pokédex de ${playerData[userId].name}.`);
}