export function pingCommand(interaction: any) {
    console.log('🏓 Exécution de /ping pour', interaction.user.tag);
    return interaction.reply('Pong !');
}