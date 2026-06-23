export function getPlayerAvatar(interaction: any, size: number = 128): string | null {
    const avatarUrl = interaction.user.displayAvatarURL({
        size: 128,       
        dynamic: true,    
        format: 'png'  
    });

    console.log(interaction.user.displayAvatarURL());
    console.log(interaction.user.displayAvatarURL({ size: 256, dynamic: true }));

    const staticAvatar = interaction.user.avatarURL({ size: 128 });

    console.log(staticAvatar);

    if (!interaction?.user) return null;

    return interaction.user.displayAvatarURL({
        size,
        dynamic: true,
        format: 'png'
    });
}