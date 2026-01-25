import { ChatInputCommandInteraction } from 'discord.js';
import { displayCannotCatchMessage } from '../message/displayCannotCatchMessage';
import { updatePlayer } from '../../utils/jsonPlayers';

const CATCH_COOLDOWN_MS = parseFloat(process.env.COOLDOWN || '30') * 60 * 1000; // Minutes → ms

export async function checkIfUserCanCatch(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  const userId = interaction.user.id;
  const now = Date.now();

  const players = await import('../../utils/jsonPlayers.js').then(m => m.readPlayers());
  const lastCapture = players[userId]?.lastCapture;

  if (lastCapture && now - lastCapture < CATCH_COOLDOWN_MS) {
    const timeLeft = CATCH_COOLDOWN_MS - (now - lastCapture);
    await displayCannotCatchMessage(interaction, timeLeft);
    return false;
  }

  await updatePlayer(userId, (player) => {
    player.lastCapture = now;
  });

  return true;
}
