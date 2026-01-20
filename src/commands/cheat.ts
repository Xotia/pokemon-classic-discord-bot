import logger from '../utils/logger';

export function cheatCommand(interaction: any) {
    logger.info('🏓 Exécution de /cheat pour', interaction.user.tag);
    return interaction.reply('Non Gwall, tu ne tricheras pas ici.');
}