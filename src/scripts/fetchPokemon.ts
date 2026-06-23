import { POKEMON_API } from "../config/url";
const fetch = require("node-fetch");

export async function fetchPokemon(id: number) {
  const pokemonRes = await fetch(`${POKEMON_API}/${id}`);
  if (!pokemonRes.ok)
    throw new Error(`Erreur pokemon ${id}: ${pokemonRes.status}`);
  const pokemon = await pokemonRes.json();
  return pokemon;
}
