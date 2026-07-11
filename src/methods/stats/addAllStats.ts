import { Player } from "../../types/Player";
import { Pokemon } from "../../types/Pokemon";
import { addCaptureToPlayer } from "../pokedex/addCaptureToPlayer";
import { addPokemonInPlayerTotalCaptures } from "./player/addPokemonInPlayerTotalCaptures";
import { addPokemonInTotalCaptures } from "./addPokemonInTotalCaptures";
import { addPokemonInTotalPokemonCaptures } from "./addPokemonInTotalPokemonCaptures";
import { addRarityInStats } from "./addRarityInStats";
import { addShinyCaptureForPlayer } from "./player/addShinyCaptureForPlayer";
import { addShinyInTotalShinyCaptures } from "./addShinyInTotalShinyCaptures";
import { addRarityInPlayerStats } from "./player/addRarityInPlayerStats";
import { addCaptureToLastCapture } from "./addCaptureToLastCapture";
import { getLoggerForGuild } from "../../utils/logger";
import { markPokemonAsCapturedInCurrentSeason } from "../player/markPokemonAsCapturedInCurrentSeason";

export async function addAllStats(guildId: string, pokemonCatched: Pokemon, isShiny: boolean, player: Player): Promise<void> {
    await addPokemonInTotalCaptures(guildId);
    await addPokemonInPlayerTotalCaptures(guildId, player.name);
    await addPokemonInTotalPokemonCaptures(guildId, pokemonCatched.name);
    await addRarityInStats(guildId, pokemonCatched.rarity);
    await addRarityInPlayerStats(guildId, player.name, pokemonCatched.rarity);
    markPokemonAsCapturedInCurrentSeason(player, pokemonCatched.id);
    if (isShiny) {
        getLoggerForGuild(guildId).info(`✨ ${pokemonCatched.name} est shiny ! Mise à jour des statistiques...`);
        await addShinyInTotalShinyCaptures(guildId);
        await addShinyCaptureForPlayer(guildId, player.name);
    }
    // logger.info(`addAllStats player=${JSON.stringify(player)}`);
    await addCaptureToPlayer(guildId, player, pokemonCatched.name);
    await addCaptureToLastCapture(guildId, player.name, pokemonCatched.id);
}