import { statsDb } from '../../config/paths';
import { promises as fs } from 'fs';
import { getLoggerForGuild } from '../../utils/logger';

export async function addPokemonInTotalPokemonCaptures(guildId: string, pokemonName: string): Promise<void> {
const logger = getLoggerForGuild(guildId);
try {
    const raw = await fs.readFile(statsDb(guildId), 'utf-8');
    let stats = JSON.parse(raw);

    if (!stats) stats = {};
    if (!stats.pokemonsTotals) stats.pokemonsTotals = {};

    logger.info(`Mise à jour du nombre de captures pour ${pokemonName}: = ${stats.pokemonsTotals[pokemonName] || 0}}`);

    stats.pokemonsTotals[pokemonName] =
      (stats.pokemonsTotals[pokemonName] || 0) + 1;
    logger.info(`Nouveau nombre de captures pour ${pokemonName} = -> ${stats.pokemonsTotals[pokemonName]}`);

    await fs.writeFile(statsDb(guildId), JSON.stringify(stats, null, 2), 'utf-8');
    
  } catch (error) {
    logger.info(`❌ Erreur addPokemonInTotalPokemonCaptures: ${error}`);
    throw error;
  }
}