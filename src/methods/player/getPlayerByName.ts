import { getPlayer } from "../../utils/loadPlayer";
import { getPlayerIdByName } from "./getPlayerIdByName";

export function getPlayerByName(guildId: string, name: string) {
  const playerId = getPlayerIdByName(guildId, name);

  if (!playerId) {
    return null;
  }

  const player = getPlayer(guildId, playerId);

  if (!player) {
    return null;
  }

  return {
    playerId,
    player,
  };
}