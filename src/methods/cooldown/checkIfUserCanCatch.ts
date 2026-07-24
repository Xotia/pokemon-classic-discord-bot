import { ChatInputCommandInteraction } from 'discord.js';
import { displayCannotCatchMessage } from '../message/displayCannotCatchMessage';
import { updatePlayer } from '../../utils/jsonPlayers';
import { getLoggerForGuild } from '../../utils/logger';
import { getCooldownMs } from '../../config/guildSettings';
import { isMeteoriteEventActive, METEORITE_ZONE_ID } from '../../features/meteoriteEvent/meteoriteEventConfig';

export const NO_POKEMON_COOLDOWN_MS = 10 * 60 * 1000; // Cooldown réduit quand aucun Pokémon n'est trouvé

export async function checkIfUserCanCatch(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  zone?: string,
): Promise<boolean> {
  const userId = interaction.user.id;
  const now = Date.now();
  const cooldownMs = getCooldownMs(guildId);
  const effectiveCooldownMs =
    zone === METEORITE_ZONE_ID && isMeteoriteEventActive() ? cooldownMs / 2 : cooldownMs;

  const players = await import('../../utils/jsonPlayers.js').then(m => m.readPlayers(guildId));
  const lastCapture = players[userId]?.lastCapture;

  if (lastCapture && now - lastCapture < effectiveCooldownMs) {
    const timeLeft = effectiveCooldownMs - (now - lastCapture);
    await displayCannotCatchMessage(interaction, timeLeft);
    getLoggerForGuild(guildId).info(`User ${interaction.user.tag} attempted to catch during cooldown. Time left: ${timeLeft} ms`);
    return false;
  }

  await updatePlayer(guildId, userId, (player) => {
    player.lastCapture = now;
  });

  return true;
}
