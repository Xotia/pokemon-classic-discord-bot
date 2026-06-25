import { createProfileIfNeeded } from '../methods/player/createProfileIfNeeded';
import { getPlayer } from '../utils/loadPlayer';
import logger from '../utils/logger';
import { loadRaidState } from '../features/raid/raidState.service';
import { buildRaidTeamEmbed } from '../features/raid/buildRaidTeamEmbed';

export async function getRaidInfo(interaction: any) {
    await interaction.deferReply();
    createProfileIfNeeded(interaction);

    logger.info('🏓 Exécution de /get-raid-info pour', interaction.user.globalName || interaction.user.username);

    const player = await getPlayer(interaction.user.id);
    if (!player) {
        logger.info(`Joueur avec l'ID ${interaction.user.id} non trouvé.`);
        return false;
    }

    const state = await loadRaidState();
    const embed = await buildRaidTeamEmbed(state, interaction.guild);
    await interaction.editReply({ embeds: [embed] });
}