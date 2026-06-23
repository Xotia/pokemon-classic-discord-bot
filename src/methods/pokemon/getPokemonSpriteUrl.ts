import { Pokemon } from "../../types/Pokemon";

export function getPokemonSpriteUrl(isShiny: boolean, pokemon: Pokemon): string {
    if (!pokemon?.id) throw new Error('pokemon.id required');
    const spriteUrl = isShiny ? pokemon.shinyImage : pokemon.image;
    return spriteUrl;
}