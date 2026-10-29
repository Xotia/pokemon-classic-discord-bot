import { getPokemonCatalog } from '../../utils/pokemonCatalog';
import { Pokemon } from '../../types/Pokemon';
import { getLoggerForGuild } from '../../utils/logger';
import { getZonePokemonIds } from '../zones/getZonePokemonIndex';

/**
 * Pokémon tirables pour une rareté (et une zone si fournie), avant exclusion.
 * Partagé entre le tirage et le diagnostic « zone vide / tout déjà capturé ».
 */
export function getPokemonPool(
  guildId: string,
  rarity: string,
  generation: string,
  zoneId?: string, // optionnel : si fourni, filtre par zone
): Pokemon[] {
  const generationNumber = Number(generation.replace('gen', ''));
  const catalog = getPokemonCatalog(guildId);

  let pool = Number.isFinite(generationNumber)
    ? catalog.filter((p) => p.generation === generationNumber && p.rarity === rarity)
    : catalog.filter((p) => p.rarity === rarity);

  // Filtre par zone si fournie, via l'index zone -> ids (une seule définition
  // de « ce Pokémon appartient à cette zone » pour la capture et la progression).
  if (zoneId) {
    const zonePokemonIds = getZonePokemonIds(guildId, zoneId);
    pool = pool.filter((p: Pokemon) => zonePokemonIds.has(p.id));
  }

  return pool;
}

export function getRandomPokemonFromRarity(
  guildId: string,
  rarity: string,
  generation: string,
  zoneId?: string,
  excludeIds?: ReadonlySet<number>, // ids à écarter du tirage (défaut : aucun)
  includeIds?: ReadonlySet<number>, // si fourni, le tirage est limité à ces ids
): Pokemon | null {
  let pool = getPokemonPool(guildId, rarity, generation, zoneId);

  if (includeIds) {
    pool = pool.filter((p) => includeIds.has(p.id));
  }

  if (excludeIds && excludeIds.size > 0) {
    pool = pool.filter((p) => !excludeIds.has(p.id));
  }

  if (pool.length === 0) {
    const context = zoneId ? `rareté "${rarity}" dans la zone "${zoneId}"` : `rareté "${rarity}"`;
    console.warn(`⚠️ Aucun Pokémon avec ${context}`);
    return null;
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  const pokemon = pool[randomIndex];

  getLoggerForGuild(guildId).info(`🎯 Capturé: ${pokemon.name} (${rarity}${zoneId ? ` | ${zoneId}` : ''})`);
  return pokemon;
}
