import { POKEMON_DB } from '../../config/paths';
import { POKEMON_GEN1_DB } from '../../config/paths';
import { POKEMON_GEN2_DB } from '../../config/paths';
import { Pokemon } from '../../types/Pokemon';
import logger from '../../utils/logger';

export function getRandomPokemonFromRarity(rarity: string, generation: string): Pokemon | null {
  let pool;

  switch (generation) {
    case 'gen1':
      pool = require(POKEMON_GEN1_DB).filter((p: Pokemon) => p.rarity === rarity);
      break;
    case 'gen2':
      pool = require(POKEMON_GEN2_DB).filter((p: Pokemon) => p.rarity === rarity);
      break;
    default:
      pool = require(POKEMON_DB).filter((p: Pokemon) => p.rarity === rarity);
      break;
  }

  if (pool.length === 0) {
    console.warn(`⚠️ Aucun Pokémon avec rareté "${rarity}"`);
    return null;
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  const pokemon = pool[randomIndex];

  logger.info(`🎯 Capturé: ${pokemon.name} (${rarity})`);
  return pokemon;
}