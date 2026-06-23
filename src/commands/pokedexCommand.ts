import { createProfileIfNeeded } from "../methods/player/createProfileIfNeeded";
import { displayPokedex } from "../methods/pokedex/displayPokedex";

export async function pokedexCommand(interaction: any) {
  createProfileIfNeeded(interaction);
  return displayPokedex(interaction);
}
