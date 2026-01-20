import logger from '../utils/logger';

export function pingCommand(interaction: any) {
    logger.info('🏓 Exécution de /ping pour', interaction.user.tag);
    return interaction.reply('Pong !');
}