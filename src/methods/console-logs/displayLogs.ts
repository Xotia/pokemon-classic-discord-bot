import { displayFooterMessage } from "./displayFooterMessage";
import { displayInLogsIfPokemonAddedToPokedex } from "./displayInLogsIfPokemonAddedToPokedex";
import { displayPokemonInLogs } from "./displayPokemonInLog";
import { displayRarityInLogs } from "./displayRarityInLogs";
import { displayShinyInLogs } from "./displayShinyInLogs";
import { displaySpriteInLogs } from "./displaySpriteInLogs";

export function displayLogs(guildId: string, interaction: any, random: { id: number; name: string; rarity: string; image: string; shinyImage: string; }, isShiny: boolean, isAdded: boolean, footer: string) {
    if (random) {
        console.log(`Le Pokémon capturé est ${random.name} (ID: ${random.id})`);
        displayPokemonInLogs(guildId, interaction, random);
        displayRarityInLogs(guildId, random.rarity);
        displayShinyInLogs(guildId, isShiny, random);
        var spriteUrl = isShiny ? random.shinyImage : random.image;
        displaySpriteInLogs(interaction, spriteUrl);
        displayInLogsIfPokemonAddedToPokedex(guildId, interaction, isAdded, random);
        displayFooterMessage(guildId, footer);
    } else {
        console.log("Aucun Pokémon capturé.");
    }
}