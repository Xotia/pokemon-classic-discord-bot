export function displaySpriteInLogs(interaction: any, spriteUrl: string) {
    if (!spriteUrl) {
        return interaction.editReply({ content: '❌ Erreur lors de la récupération du sprite du pokemon' });
    }
}