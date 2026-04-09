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

export async function addAllStats(interaction: any, pokemonCatched: Pokemon, isShiny: boolean, player: Player): Promise<void> {
    await addPokemonInTotalCaptures();
    await addPokemonInPlayerTotalCaptures(interaction.user.globalName || interaction.user.username);
    await addPokemonInTotalPokemonCaptures(pokemonCatched.name);
    await addRarityInStats(pokemonCatched.rarity);
    await addRarityInPlayerStats(interaction.user.globalName || interaction.user.username, pokemonCatched.rarity);
    if (isShiny) {
        await addShinyInTotalShinyCaptures();
        await addShinyCaptureForPlayer(interaction.user.globalName || interaction.user.username);
    }
    await addCaptureToPlayer(player, pokemonCatched.id, isShiny);
    await addCaptureToLastCapture(interaction.user.globalName || interaction.user.username, pokemonCatched.id);
}