import { displayRandomPokedex } from '../methods/pokedex/displayRandomPokedex';


export async function randomPokedexCommand(interaction: any) {
    return displayRandomPokedex(interaction);
}