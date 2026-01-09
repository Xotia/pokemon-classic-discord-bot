// checkIfUserCanCatch.ts
import { ChatInputCommandInteraction } from 'discord.js';
import { displayCannotCatchMessage } from '../message/displayCannotCatchMessage';

const CATCH_COOLDOWN_MS = parseFloat(process.env.COOLDOWN || '10') * 1000;

export async function checkIfUserCanCatch(
  interaction: ChatInputCommandInteraction,
  catchCooldown: Map<string, number>,
): Promise<boolean> {
  const userId = interaction.user.id;
  const now = Date.now();
  const last = catchCooldown.get(userId);

  if (last && now - last < CATCH_COOLDOWN_MS) {
    const timeLeft = CATCH_COOLDOWN_MS - (now - last);
    await displayCannotCatchMessage(interaction, timeLeft);
    return false;
  }

  catchCooldown.set(userId, now);
  return true;
}
