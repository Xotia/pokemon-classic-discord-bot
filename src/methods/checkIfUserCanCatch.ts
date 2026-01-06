// checkIfUserCanCatch.ts
import { ChatInputCommandInteraction } from 'discord.js';
import { displayCannotCatchMessage } from './displayCannotCatchMessage';

const CATCH_COOLDOWN_MS = 30 * 60 * 1000;
// const CATCH_COOLDOWN_MS = 10 * 1000; // pour tester

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
