import fs from 'fs';
import { PLAYERS_DB } from '../../config/paths';
import logger from '../../utils/logger';
import { Player } from '../../types/Player';

export function createProfileIfNeeded(interaction: any) {
    if (!interaction || !interaction.user) {
        logger.info(`❌ Interaction ou interaction.user manquant !`);
        console.error('❌ Interaction ou interaction.user manquant !', interaction);
        throw new Error('Interaction invalide');
    }
    const userId = interaction.user.id;
    const userName = interaction.user.globalName || interaction.user.username;
    const playerData = JSON.parse(fs.readFileSync(PLAYERS_DB, 'utf-8')) as Record<string, Player>;
    if (!playerData[userId]) {
        logger.info(`Création d'un nouveau profil pour le joueur ${userName} (ID: ${userId}).`);
        playerData[userId] = { name: userName, randomCaptures: [] };
        fs.writeFileSync(PLAYERS_DB, JSON.stringify(playerData, null, 2), 'utf-8');
    } else {
        logger.info(`Le profil pour le joueur ${userName} (ID: ${userId}) existe déjà.`);
    }
}