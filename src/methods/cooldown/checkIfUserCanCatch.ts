import { ChatInputCommandInteraction } from 'discord.js';
import { displayCannotCatchMessage } from '../message/displayCannotCatchMessage';
import { updatePlayer } from '../../utils/jsonPlayers';
import { getLoggerForGuild } from '../../utils/logger';
import { getCooldownMs } from '../../config/guildSettings';

export const NO_POKEMON_COOLDOWN_MS = 10 * 60 * 1000; // Cooldown réduit quand aucun Pokémon n'est trouvé

export async function checkIfUserCanCatch(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<boolean> {
  const userId = interaction.user.id;
  const now = Date.now();
  const cooldownMs = getCooldownMs(guildId);

  const players = await import('../../utils/jsonPlayers.js').then(m => m.readPlayers(guildId));
  const lastCapture = players[userId]?.lastCapture;

  if (lastCapture && now - lastCapture < cooldownMs) {
    const timeLeft = cooldownMs - (now - lastCapture);
    await displayCannotCatchMessage(interaction, timeLeft);
    getLoggerForGuild(guildId).info(`User ${interaction.user.tag} attempted to catch during cooldown. Time left: ${timeLeft} ms`);
    return false;
  }

  await updatePlayer(guildId, userId, (player) => {
    player.lastCapture = now;
  });

  return true;
}
