import { POKEMON_DB } from '../../config/paths';
import { POKEMON_GEN1_DB } from '../../config/paths';
import { POKEMON_GEN2_DB } from '../../config/paths';
import { Pokemon } from '../../types/Pokemon';
import logger from '../../utils/logger';

export function getRandomPokemonFromRarity(
  rarity: string,
  generation: string,
  zoneId?: string  // optionnel : si fourni, filtre par zone
): Pokemon | null {
  let pool: Pokemon[];

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

  // Filtre par zone si fournie
  if (zoneId) {
    pool = pool.filter((p: Pokemon) => p.zones?.includes(zoneId));
  }

  if (pool.length === 0) {
    const context = zoneId ? `rareté "${rarity}" dans la zone "${zoneId}"` : `rareté "${rarity}"`;
    console.warn(`⚠️ Aucun Pokémon avec ${context}`);
    return null;
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  const pokemon = pool[randomIndex];

  logger.info(`🎯 Capturé: ${pokemon.name} (${rarity}${zoneId ? ` | ${zoneId}` : ''})`);
  return pokemon;
}