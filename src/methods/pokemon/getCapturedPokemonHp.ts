import { POKEMON_DB } from "../../config/paths";
import { Pokemon } from "../../types/Pokemon";
import fs from "fs";

export function getCapturedPokemonHp(pokemonId: number): number {
  const raw = fs.readFileSync(POKEMON_DB, "utf-8");
  const pokemons = JSON.parse(raw) as Pokemon[];
  const pokemonData = pokemons.find((pokemon: any) => pokemon.id === pokemonId);

  if (!pokemonData?.stats?.hp) {
    return 0;
  }

  return pokemonData.stats.hp;
}