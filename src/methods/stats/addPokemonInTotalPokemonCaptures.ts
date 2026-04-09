import { STATS_DB } from '../../config/paths';
import { promises as fs } from 'fs';
import logger from '../../utils/logger';

export async function addPokemonInTotalPokemonCaptures(pokemonName: string): Promise<void> {
try {
    const raw = await fs.readFile(STATS_DB, 'utf-8');
    let stats = JSON.parse(raw);

    if (!stats) stats = {};
    if (!stats.pokemonsTotals) stats.pokemonsTotals = {};

    logger.info(`Mise à jour du nombre de captures pour ${pokemonName}: = ${stats.pokemonsTotals[pokemonName] || 0}}`);

    stats.pokemonsTotals[pokemonName] = 
      (stats.pokemonsTotals[pokemonName] || 0) + 1;
    logger.info(`Nouveau nombre de captures pour ${pokemonName} = -> ${stats.pokemonsTotals[pokemonName]}`);

    await fs.writeFile(STATS_DB, JSON.stringify(stats, null, 2), 'utf-8');
    
  } catch (error) {
    logger.info(`❌ Erreur addPokemonInTotalPokemonCaptures: ${error}`);
    throw error;
  }
}