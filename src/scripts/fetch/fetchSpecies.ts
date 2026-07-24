import { SPECIES_API } from "../../config/url";
const fetch = require("node-fetch");

export async function fetchSpecies(id: number) {
  const speciesRes = await fetch(`${SPECIES_API}/${id}`);
  if (!speciesRes.ok)
    throw new Error(`Erreur species ${id}: ${speciesRes.status}`);
  const species = await speciesRes.json();
  return species;
}
