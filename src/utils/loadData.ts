import { POKEMON_DB, playersDb } from '../config/paths';
import fs from 'fs';
import { Pokemon } from '../types/Pokemon';
import { Player } from '../types/Player';

export function loadPokemon(): Pokemon[] {
    return JSON.parse(fs.readFileSync(POKEMON_DB, 'utf8')) as Pokemon[];
}

export function loadPlayers(guildId: string): Player[] {
    return JSON.parse(fs.readFileSync(playersDb(guildId), 'utf8')) as Player[];
}