import { Player } from "../../types/Player";

export function registerCapturedPokemon(
  player: Player,
  pokemonId: number,
  isShiny: boolean,
): void {
  player.captureList ??= {};

  const key = String(pokemonId);

  player.captureList[key] ??= {
    total: 0,
    shiny: 0,
    capturedInCurrentSeason: false,
  };

  player.captureList[key].total += 1;

  if (isShiny) {
    player.captureList[key].shiny += 1;
  }

  player.captureList[key].capturedInCurrentSeason = true;
}