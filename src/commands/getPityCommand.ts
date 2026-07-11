import { createProfileIfNeeded } from '../methods/player/createProfileIfNeeded';
import { getPlayer } from '../utils/loadPlayer';
import { getLoggerForGuild } from '../utils/logger';
import { getPityThreshold } from '../config/guildSettings';

export async function getPity(interaction: any) {
    await interaction.deferReply();

    const guildId = interaction.guildId;
    if (!guildId) {
        return interaction.editReply("Cette commande n'est disponible que sur un serveur.");
    }
    createProfileIfNeeded(interaction, guildId);
    const logger = getLoggerForGuild(guildId);
    const pityThreshold = getPityThreshold(guildId);

    logger.info('🏓 Exécution de /pity pour', interaction.user.globalName || interaction.user.username);

    const player = await getPlayer(guildId, interaction.user.id);
    if (!player) {
        logger.info(`Joueur avec l'ID ${interaction.user.id} non trouvé.`);
        return false;
    }
    if (!player.pityCounter) {
        player.pityCounter = 0;
        logger.info(`Initialisation du compteur de pity pour le joueur ${player.name}`);
    }else{
        logger.info(`Compteur de pity actuel pour le joueur ${player.name} : ${player.pityCounter}/${pityThreshold}`);
    }
    const pityTime = player.pityCounter >= pityThreshold;
    return interaction.editReply(`Compteur de pity actuel : ${player.pityCounter}/${pityThreshold} - Prochaine capture boostée : ${pityTime ? 'Oui' : 'Non'}`);
}