import { createProfileIfNeeded } from '../methods/player/createProfileIfNeeded';
import { getPlayer } from '../utils/loadPlayer';
import logger from '../utils/logger';
import { loadRaidState } from '../features/raid/raidState.service';
import { buildRaidTeamEmbed } from '../features/raid/buildRaidTeamEmbed';

export async function getRaidInfo(interaction: any) {
    await interaction.deferReply();

    const guildId = interaction.guildId;
    if (!guildId) {
        return interaction.editReply("Cette commande n'est disponible que sur un serveur.");
    }
    createProfileIfNeeded(interaction, guildId);

    logger.info('🏓 Exécution de /get-raid-info pour', interaction.user.globalName || interaction.user.username);

    const player = await getPlayer(guildId, interaction.user.id);
    if (!player) {
        logger.info(`Joueur avec l'ID ${interaction.user.id} non trouvé.`);
        return false;
    }

    const state = await loadRaidState(guildId);
    const embed = await buildRaidTeamEmbed(state, interaction.guild);
    await interaction.editReply({ embeds: [embed] });
}