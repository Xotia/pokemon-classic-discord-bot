import { displayPokedex } from '../methods/pokedex/displayPokedex';

export async function pokedexCommand(interaction: any) {
    return displayPokedex(interaction);
}