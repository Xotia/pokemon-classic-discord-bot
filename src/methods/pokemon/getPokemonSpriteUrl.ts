export function getPokemonSpriteUrl(isShiny: boolean, pokemon: { id: number; name: string; spawnRate: number; catchRateRaw: number; image: string; shinyImage: string; }): string {
    if (!pokemon?.id) throw new Error('pokemon.id required');
    const spriteUrl = isShiny ? pokemon.shinyImage : pokemon.image;
    return spriteUrl;
}