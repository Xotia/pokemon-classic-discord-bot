import { verifyIfPokemonIsInPokedex } from '../../methods/pokedex/verifyIfPokemonIsInPokedex';
import { addToPokedex } from './addToPokedex';
import { savePlayerData } from '../file/savePlayerData';
import { getPlayer } from '../../utils/loadPlayer';

//Ajoute le pokemon au pokedex du joueur si il n'est pas déjà présent dans le pokedex
export function addPokemonToPokedexIfNew(interaction: any, pokemonId: number): boolean {
    let playerData = getPlayer(interaction.user.id);

    if(!playerData){
      console.log("Les données du joueurs sont vide");
      return false;
    }

    if (!verifyIfPokemonIsInPokedex(playerData, pokemonId, interaction.user.id)) {
        addToPokedex(playerData, pokemonId);
        savePlayerData(interaction, playerData);
        return true;
    }
    return false;
}