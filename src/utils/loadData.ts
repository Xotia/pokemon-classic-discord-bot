import { POKEMON_DB } from '../config/paths';
import fs from 'fs';
import { PLAYERS_DB } from '../config/paths';
import { POKEMON_GEN2_DB } from '../config/paths';
import { Pokemon } from '../types/Pokemon';
import { Player } from '../types/Player';

export function loadPokemon(): Pokemon[] {
    return JSON.parse(fs.readFileSync(POKEMON_DB, 'utf8')) as Pokemon[];
}

export function loadPlayers(): Player[] {
    return JSON.parse(fs.readFileSync(PLAYERS_DB, 'utf8')) as Player[];
}

export function loadGen2PokemonList():Pokemon[] {
    return JSON.parse(fs.readFileSync(POKEMON_GEN2_DB, 'utf8')) as Pokemon[];
}