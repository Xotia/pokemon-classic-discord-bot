import { POKEMON_DB } from "../../config/paths";

import fs from 'fs';
import { Pokemon } from "../../types/Pokemon";

export function getTotalPokemonNumber(): number {
    try {
        const raw = fs.readFileSync(POKEMON_DB, 'utf-8');
        const pokemons = JSON.parse(raw) as Pokemon[];

        if (!Array.isArray(pokemons)) {
            throw new Error('POKEMON_DB n\'est pas un tableau');
        }

        return pokemons.length;
    } catch (error) {
        throw new Error(`getTotalPokemonNumber échoué: ${(error as Error).message}`);
    }
}
