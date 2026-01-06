import path from 'path';
import players from '../../data/players.json'
import { verifyIfPokemonIsOnPokedex } from './verifyIfPokemonIsOnPokedex';
import { addToPokedex } from './addToPokedex';
import { savePlayerData } from './savePlayerData';

interface PlayerData {
    name: string;
    captures: number[];
}

const playerDataPath = path.join(__dirname, '../../data/players.json');
let playerData = players as Record<string, PlayerData>;

//Ajoute le pokemon au pokedex du joueur si il n'est pas déjà présent dans le pokedex
export function addPokemonToPokedexIfNew(interaction: any, pokemonId: number): boolean {
    const userId = interaction.user.id;
    const userName = interaction.user.globalName || interaction.user.username;
    if (!playerData[userId]) {
        console.log(`Création d'un nouveau profil pour le joueur ${userName} (ID: ${userId}).`);
        playerData[userId] = { name: userName, captures: [] };
        savePlayerData(playerDataPath, playerData);
    }
    
    if (!verifyIfPokemonIsOnPokedex(playerData, pokemonId, userId)) {
        addToPokedex(playerData, pokemonId, userId);
        savePlayerData(playerDataPath, playerData);
        return true;
    }
    return false;
}