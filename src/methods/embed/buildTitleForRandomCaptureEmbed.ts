export function buildTitleForRandomCaptureEmbed(isShiny: boolean, pokemon: { id: number; name: string; rarity:string; image: string; shinyImage: string; }, color: { color: number; rarity: string }): string {
    return isShiny ? `✨ Un ${pokemon.name} shiny sauvage est apparu! ✨ (${color.rarity})` : `Un ${pokemon.name} sauvage est apparu! (${color.rarity})`;
}