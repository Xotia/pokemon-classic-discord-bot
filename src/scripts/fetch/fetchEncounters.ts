import { POKEMON_API } from "../../config/url";
const fetch = require("node-fetch");

export async function fetchEncounters(id: number) {
  const encountersRes = await fetch(`${POKEMON_API}/${id}/encounters`);
  if (!encountersRes.ok)
    throw new Error(`Erreur encounters ${id}: ${encountersRes.status}`);
  const encounters = await encountersRes.json();
  return encounters;
}
