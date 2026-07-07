import { checkIfUserCanCatch } from "../methods/cooldown/checkIfUserCanCatch";
import { logCaptureLocationSelection } from "../methods/zones/logCaptureLocationSelection";
import { resolveCaptureLocation } from "../methods/zones/resolveCaptureLocation";
import { getCapturePlayer } from "../methods/player/getCapturePlayer";
import { tryCatchPokemon } from "../methods/pokemon/tryCatchPokemon";
import { handleNoPokemonFound } from "../methods/pokemon/handleNoPokemonFound";
import { handleSuccessfulCapture } from "../methods/pokemon/handleSuccessfulCapture";
import { createProfileIfNeeded } from "../methods/player/createProfileIfNeeded";
import { ensureGuildDataFiles } from "../config/guilds";

export async function captureCommand(interaction: any) {
  await interaction.deferReply();

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply("Cette commande n'est disponible que sur un serveur.");
    return;
  }
  ensureGuildDataFiles(guildId);

  createProfileIfNeeded(interaction, guildId);

  const location = await resolveCaptureLocation(interaction, guildId);
  if (!location) return;

  logCaptureLocationSelection(location);

  const { generation, zone } = location;

  const canCatch = await checkIfUserCanCatch(interaction, guildId);
  if (!canCatch) return;

  const player = getCapturePlayer(interaction, guildId);
  if (!player) return;

  const { pokemonCatched, rarity } = await tryCatchPokemon(
    guildId,
    player,
    generation,
    zone,
  );

  if (!pokemonCatched) {
    await handleNoPokemonFound(interaction, guildId, rarity);
    return;
  }

  await handleSuccessfulCapture(
    interaction,
    guildId,
    player,
    pokemonCatched,
    rarity,
    zone,
  );
}
