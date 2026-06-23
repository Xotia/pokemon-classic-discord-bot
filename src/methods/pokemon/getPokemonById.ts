import fs from "fs";
import { POKEMON_DB } from "../../config/paths";
import { Pokemon } from "../../types/Pokemon";

let cache: Pokemon[] | null = null;

export function getPokemonById(id: number): Pokemon | null {
  if (!cache) {
    cache = JSON.parse(fs.readFileSync(POKEMON_DB, "utf-8")) as Pokemon[];
  }
  return cache.find((p) => p.id === id) ?? null;
}
