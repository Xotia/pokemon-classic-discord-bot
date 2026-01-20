import { ChatInputCommandInteraction } from 'discord.js';

export function displayCannotCatchMessage(
  interaction: ChatInputCommandInteraction,
  timeLeftMs: number,
) {
  const remainingMinutes = Math.floor(timeLeftMs / 60000);
  const remainingSeconds = Math.floor((timeLeftMs % 60000) / 1000);

  return interaction.editReply(
    `⏳ Tu dois encore attendre ${remainingMinutes} minute(s) et ${remainingSeconds} seconde(s) avant de refaire /random-capture.`,
  );
}
