import { checkIfUserCanCatch } from "../methods/cooldown/checkIfUserCanCatch";
import { logCaptureLocationSelection } from "../methods/zones/logCaptureLocationSelection";
import { resolveCaptureLocation } from "../methods/zones/resolveCaptureLocation";
import { getCapturePlayer } from "../methods/player/getCapturePlayer";
import { tryCatchPokemon } from "../methods/pokemon/tryCatchPokemon";
import { handleNoPokemonFound } from "../methods/pokemon/handleNoPokemonFound";
import { handleSuccessfulCapture } from "../methods/pokemon/handleSuccessfulCapture";
import { createProfileIfNeeded } from "../methods/player/createProfileIfNeeded";

export async function captureCommand(interaction: any) {
  await interaction.deferReply();
  createProfileIfNeeded(interaction);
  
  const location = await resolveCaptureLocation(interaction);
  if (!location) return;

  logCaptureLocationSelection(location);

  const { generation, zone } = location;

  const canCatch = await checkIfUserCanCatch(interaction);
  if (!canCatch) return;

  const player = getCapturePlayer(interaction);
  if (!player) return;

  const { pokemonCatched, rarity } = await tryCatchPokemon(
    player,
    generation,
    zone,
  );

  if (!pokemonCatched) {
    await handleNoPokemonFound(interaction, player, rarity);
    return;
  }

  await handleSuccessfulCapture(
    interaction,
    player,
    pokemonCatched,
    rarity,
    zone,
  );
}
