import { Player } from "../../types/Player";

export function getPokedexCaptureIds(player: Player): number[] {
  return Object.keys(player.captureList ?? {})
    .map((id) => parseInt(id, 10))
    .sort((a, b) => a - b);
}