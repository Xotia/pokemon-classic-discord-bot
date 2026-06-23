import { getNewPokemon } from '../pokemon/getNewPokemon';
import { Rarity } from '../../config/rarity';

export async function getPokemonByRarity(
  generation: string,
  zone: string,
  rarity: Rarity,
) {
  const pokemonCatched = await getNewPokemon(rarity, generation, zone);

  return {
    pokemonCatched,
    rarity,
  };
}