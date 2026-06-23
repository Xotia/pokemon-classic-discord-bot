import { BuildDescriptionParams } from "../../types/Params";

export function buildDescriptionForPokemonCaptureEmbed({
  pokemon,
  isShiny,
  isNewPokemon,
  trainerName,
}: BuildDescriptionParams): string {
  return [
    `**${trainerName}** a capturé ${pokemon.name}${isShiny ? " ✨" : ""} !`,
    isNewPokemon ? `🆕 C'est la première fois que ${trainerName} capture un ${pokemon.name}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}