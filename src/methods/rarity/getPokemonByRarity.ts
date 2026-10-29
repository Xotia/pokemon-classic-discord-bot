import { getNewPokemon } from '../pokemon/getNewPokemon';
import { Rarity } from '../../config/rarity';

export async function getPokemonByRarity(
  guildId: string,
  generation: string,
  zone: string,
  rarity: Rarity,
  excludeIds?: ReadonlySet<number>,
  includeIds?: ReadonlySet<number>,
) {
  const pokemonCatched = await getNewPokemon(guildId, rarity, generation, zone, excludeIds, includeIds);

  return {
    pokemonCatched,
    rarity,
  };
}