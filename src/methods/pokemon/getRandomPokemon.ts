export function getRandomPokemon(pokemonList: { id: number; name: string; rarity: string; image: string; shinyImage: string; }[]) {
  if (!pokemonList?.length) throw new Error('pokemonList cannot be empty');
  const randomIndex = Math.floor(Math.random() * pokemonList.length);
  return pokemonList[randomIndex];
}
