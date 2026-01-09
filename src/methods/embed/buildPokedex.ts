import { getPokemonName } from "../pokemon/getPokemonName";

export function buildPokedex(playerPokedex: number[]): string {
    if (!playerPokedex || playerPokedex.length === 0) {
        return "Ton Pokédex est vide.";
    }else{
        // Trier les Pokémon par ID
        const sortedPokedex = playerPokedex.sort((a, b) => a - b);
        let entries = "";
        for(let i=0; i<sortedPokedex.length; i++){
            const pokemonName=getPokemonName(sortedPokedex[i]);
            if(pokemonName){
                const entry = `${sortedPokedex[i]} - ${pokemonName}\n`;
                entries += entry;
                console.log("Entrée ajoutée à entries :", entry);
            }
        }
        console.log("Pokedex construit :");
        console.log(entries);
        return entries;
    }
}