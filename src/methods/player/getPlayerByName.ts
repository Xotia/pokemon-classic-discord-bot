import { getPlayer } from "../../utils/loadPlayer";
import { getPlayerIdByName } from "./getPlayerIdByName";

export function getPlayerByName(name: string) {
  const playerId = getPlayerIdByName(name);

  if (!playerId) {
    return null;
  }

  const player = getPlayer(playerId);

  if (!player) {
    return null;
  }

  return {
    playerId,
    player,
  };
}