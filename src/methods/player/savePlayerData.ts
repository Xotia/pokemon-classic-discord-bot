import fs from 'fs';
import { playersDb } from '../../config/paths';
import { Player } from '../../types/Player';
import { getLoggerForGuild } from '../../utils/logger';

export async function savePlayerData(interaction: any, guildId: string, playerData: Player) {
  const logger = getLoggerForGuild(guildId);
  try {
    const allPlayers: Record<string, Player> = JSON.parse(
      fs.readFileSync(playersDb(guildId), 'utf8')
    ) || {};

    allPlayers[interaction.user.id] = playerData;

    fs.writeFileSync(playersDb(guildId), JSON.stringify(allPlayers, null, 2), 'utf-8');
    logger.info(`✅ Profil ${playerData.name} sauvegardé`);
  } catch (error) {
    logger.info(`❌ Erreur sauvegarde: ${error}`);
    console.error('❌ Erreur sauvegarde:', error);
  }
}