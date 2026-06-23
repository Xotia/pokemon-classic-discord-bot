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
import logger from "../../utils/logger";
import { markPokemonAsCapturedInCurrentSeason } from "../player/markPokemonAsCapturedInCurrentSeason";

export async function addAllStats(pokemonCatched: Pokemon, isShiny: boolean, player: Player): Promise<void> {
    await addPokemonInTotalCaptures();
    await addPokemonInPlayerTotalCaptures(player.name);
    await addPokemonInTotalPokemonCaptures(pokemonCatched.name);
    await addRarityInStats(pokemonCatched.rarity);
    await addRarityInPlayerStats(player.name, pokemonCatched.rarity);
    markPokemonAsCapturedInCurrentSeason(player, pokemonCatched.id);
    if (isShiny) {
        logger.info(`✨ ${pokemonCatched.name} est shiny ! Mise à jour des statistiques...`);
        await addShinyInTotalShinyCaptures();
        await addShinyCaptureForPlayer(player.name);
    }
    // logger.info(`addAllStats player=${JSON.stringify(player)}`);
    await addCaptureToPlayer(player, pokemonCatched.name);
    await addCaptureToLastCapture(player.name, pokemonCatched.id);
}