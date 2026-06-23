import { Player } from "../../types/Player";

export function markPokemonAsCapturedInCurrentSeason(
  player: Player,
  pokemonId: number,
): void {
  player.captureList ??= {};

  const key = String(pokemonId);

  player.captureList[key] ??= {
    total: 0,
    shiny: 0,
    capturedInCurrentSeason: false,
  };

  player.captureList[key].capturedInCurrentSeason = true;
}