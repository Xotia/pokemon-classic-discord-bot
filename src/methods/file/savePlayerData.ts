import fs from 'fs';
import { PLAYERS_DB } from '../../config/paths';
import { Player } from '../../types/Player';

export async function savePlayerData(interaction: any, playerData: Player) {
  try {
    // Charge TOUS les joueurs existants
    const allPlayers: Record<string, Player> = JSON.parse(
      fs.readFileSync(PLAYERS_DB, 'utf8')
    ) || {};

    // Met à jour SEULEMENT ce joueur
    allPlayers[interaction.user.id] = playerData;

    // Sauvegarde TOUS les joueurs
    fs.writeFileSync(PLAYERS_DB, JSON.stringify(allPlayers, null, 2), 'utf-8');
    console.log(`✅ Profil ${playerData.name} sauvegardé`);
  } catch (error) {
    console.error('❌ Erreur sauvegarde:', error);
  }
}