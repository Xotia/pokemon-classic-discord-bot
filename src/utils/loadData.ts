import fs from 'fs';
import { POKEMON_DB } from '../config/paths';
import { PLAYERS_DB } from '../config/paths';
import { Pokemon } from '../types/Pokemon';
import { Player } from '../types/Player';

export function loadPokemon(): Pokemon[] {
    return JSON.parse(fs.readFileSync(POKEMON_DB, 'utf8')) as Pokemon[];
}

export function loadPlayers(): Player[] {
    return JSON.parse(fs.readFileSync(PLAYERS_DB, 'utf8')) as Player[];
}