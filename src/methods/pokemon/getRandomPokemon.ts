export function getRandomPokemon(pokemonList: { id: number; name: string; spawnRate: number; catchRateRaw: number; image: string; shinyImage: string; }[]) {
  const randomIndex = Math.floor(Math.random() * pokemonList.length);
  return pokemonList[randomIndex];
}