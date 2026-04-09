import { createProfileIfNeeded } from '../methods/file/createProfileIfNeeded';
import { getPlayer } from '../utils/loadPlayer';
import logger from '../utils/logger';

export async function getPity(interaction: any) {
    await interaction.deferReply();
    logger.info('🏓 Exécution de /pity pour', interaction.user.globalName || interaction.user.username);

    createProfileIfNeeded(interaction);

    const player = await getPlayer(interaction.user.id);
    if (!player) {
        logger.info(`Joueur avec l'ID ${interaction.user.id} non trouvé.`);
        return false;
    }
    if (!player.pityCounter) {
        player.pityCounter = 0;
        logger.info(`Initialisation du compteur de pity pour le joueur ${player.name}`);
    }else{
        logger.info(`Compteur de pity actuel pour le joueur ${player.name} : ${player.pityCounter}/${process.env.PITY_THRESHOLD}`);
    }
    const pityTime = player.pityCounter >= parseInt(process.env.PITY_THRESHOLD || '10');
    return interaction.editReply(`Compteur de pity actuel : ${player.pityCounter}/${process.env.PITY_THRESHOLD} - Prochaine capture boostée : ${pityTime ? 'Oui' : 'Non'}`);
}