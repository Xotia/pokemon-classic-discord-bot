import { STATS_DB } from '../../../config/paths';
import { promises as fs } from 'fs';
import logger from '../../../utils/logger';

export async function addPokemonInRandomTotalPokemonCaptures(pokemonName: string): Promise<void> {
try {
    const raw = await fs.readFile(STATS_DB, 'utf-8');
    const stats = JSON.parse(raw);

    if (!stats.random) stats.random = {};
    if (!stats.random.pokemonsTotals) stats.random.pokemonsTotals = {};

    logger.info(`Mise à jour du nombre de captures pour ${pokemonName}: = ${stats.random.pokemonsTotals[pokemonName] || 0}}`);

    stats.random.pokemonsTotals[pokemonName] = 
      (stats.random.pokemonsTotals[pokemonName] || 0) + 1;
    logger.info(`Nouveau nombre de captures pour ${pokemonName} = -> ${stats.random.pokemonsTotals[pokemonName]}`);

    await fs.writeFile(STATS_DB, JSON.stringify(stats, null, 2), 'utf-8');
    
  } catch (error) {
    logger.info(`❌ Erreur addPokemonInRandomTotalPokemonCaptures: ${error}`);
    throw error;
  }
}