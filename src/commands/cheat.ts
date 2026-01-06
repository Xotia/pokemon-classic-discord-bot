export function cheatCommand(interaction: any) {
    console.log('🏓 Exécution de /cheat pour', interaction.user.tag);
    return interaction.reply('Non Gwall, tu ne tricheras pas ici.');
}