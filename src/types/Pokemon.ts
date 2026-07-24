import { Rarity } from "../config/rarity";

export interface Pokemon {
  id: number;
  name: string;
  originalName: string;
  rarity: Rarity;
  image: string;
  shinyImage: string;
  zones?: string[];
  types: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  generation: number;
  effectiveness: {
    defense: Record<string, number>;
    attack: Record<string, number>;
  };
}

export type PokemonRecord = Record<number, Pokemon>;
