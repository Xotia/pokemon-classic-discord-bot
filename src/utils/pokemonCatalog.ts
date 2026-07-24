import fs from 'node:fs';
import { POKEMON_GEN1_DB, POKEMON_GEN2_DB, POKEMON_GEN3_DB, othermonsDb } from '../config/paths';
import { Pokemon } from '../types/Pokemon';

const catalogCache = new Map<string, Pokemon[]>();

function loadPokemonFile(filePath: string): Pokemon[] {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Pokemon[];
}

/**
 * Catalogue Pokémon d'un serveur : gen1 + gen2 + gen3 (partagés) + le roster
 * custom propre à ce serveur (data/guilds/<guildId>/othermons.json).
 */
export function getPokemonCatalog(guildId: string): Pokemon[] {
  const cached = catalogCache.get(guildId);
  if (cached) return cached;

  const catalog = [
    ...loadPokemonFile(POKEMON_GEN1_DB),
    ...loadPokemonFile(POKEMON_GEN2_DB),
    ...loadPokemonFile(POKEMON_GEN3_DB),
    ...loadPokemonFile(othermonsDb(guildId)),
  ];

  catalogCache.set(guildId, catalog);
  return catalog;
}
