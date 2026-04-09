import { Rarity } from "../config/rarity";

export interface Pokemon {
    id: number;
    name: string;
    rarity: Rarity;
    image: string;
    shinyImage: string;
}

export type PokemonRecord = Record <number, Pokemon>;