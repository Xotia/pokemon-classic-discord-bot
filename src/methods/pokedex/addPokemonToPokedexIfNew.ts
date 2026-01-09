import path from 'path';
import players from '../../../data/players.json'
import { verifyIfPokemonIsInPokedex } from '../../methods/pokedex/verifyIfPokemonIsInPokedex';
import { addToPokedex } from './addToPokedex';
import { savePlayerData } from '../file/savePlayerData';

interface PlayerData {
    name: string;
    randomCaptures: number[];
}

const playerDataPath = path.join(__dirname, '../../../data/players.json');
let playerData = players as Record<string, PlayerData>;

//Ajoute le pokemon au pokedex du joueur si il n'est pas déjà présent dans le pokedex
export function addPokemonToPokedexIfNew(interaction: any, pokemonId: number): boolean {
    const userId = interaction.user.id;
    const userName = interaction.user.globalName || interaction.user.username;
    if (!playerData[userId]) {
        console.log(`Création d'un nouveau profil pour le joueur ${userName} (ID: ${userId}).`);
        playerData[userId] = { name: userName, randomCaptures: [] };
        savePlayerData(playerDataPath, playerData);
    }
    
    if (!verifyIfPokemonIsInPokedex(playerData, pokemonId, userId)) {
        addToPokedex(playerData, pokemonId, userId);
        savePlayerData(playerDataPath, playerData);
        return true;
    }
    return false;
}