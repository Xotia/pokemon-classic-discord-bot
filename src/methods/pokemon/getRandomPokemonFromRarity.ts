import pokemonList from '../../../data/pokemon-list.json'
import { Pokemon } from '../../types/Pokemon';
import logger from '../../utils/logger';

export function getRandomPokemonFromRarity(rarity: string): Pokemon | null {
  const pool = (pokemonList as Pokemon[]).filter(p => p.rarity === rarity);
  
  if (pool.length === 0) {
    console.warn(`⚠️ Aucun Pokémon avec rareté "${rarity}"`);
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * pool.length);
  const pokemon = pool[randomIndex];
  
  logger.info(`🎯 Capturé: ${pokemon.name} (${rarity})`);
  return pokemon;
}