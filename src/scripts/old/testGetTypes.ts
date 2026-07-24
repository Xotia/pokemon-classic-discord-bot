import { getPokemonTypes } from "./getPokemonTypes";
import getMultipliers from "./getMultipliers";

const POKEMON_API = 'https://pokeapi.co/api/v2/pokemon';

async function main(){
    const id = 1;

    const pokemonRes = await fetch(`${POKEMON_API}/${id}`);

    if (!pokemonRes.ok) throw new Error(`Erreur pokemon ${id}: ${pokemonRes.status}`);

    const pokemon = await pokemonRes.json();

    const types = getPokemonTypes(pokemon.types);
    const result = getMultipliers(types);
    console.log(result);
}

main().catch(console.error);