import { getNewPokemon } from '../pokemon/getNewPokemon';
import { Rarity } from '../../config/rarity';

export async function getPokemonByRarity(
  guildId: string,
  generation: string,
  zone: string,
  rarity: Rarity,
) {
  const pokemonCatched = await getNewPokemon(guildId, rarity, generation, zone);

  return {
    pokemonCatched,
    rarity,
  };
}