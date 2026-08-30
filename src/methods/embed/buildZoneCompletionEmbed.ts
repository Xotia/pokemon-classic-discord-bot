import { EmbedBuilder } from "discord.js";
import { Zone } from "../../types/zones";
import { ZoneCompletion } from "../zones/computeZoneCompletion";

const BAR_LENGTH = 20;

function buildProgressBar(percentage: number): string {
  const filled = Math.round((percentage / 100) * BAR_LENGTH);
  return "█".repeat(filled) + "░".repeat(BAR_LENGTH - filled);
}

function pickColor(percentage: number): number {
  if (percentage >= 100) return 0xf1c40f;
  if (percentage >= 75) return 0x2ecc71;
  if (percentage >= 40) return 0x3498db;
  return 0x95a5a6;
}

export function buildZoneCompletionEmbed(
  trainerName: string,
  zone: Zone,
  completion: ZoneCompletion,
): EmbedBuilder {
  const lines = [
    `\`${buildProgressBar(completion.percentage)}\` **${completion.percentage} %**`,
    "",
    `📗 **Capturés cette saison :** ${completion.captured} / ${completion.total}`,
    `🔍 **Restants :** ${completion.missing}`,
    `✨ **Dont shinys :** ${completion.shiny}`,
  ];

  if (completion.captured === completion.total && completion.total > 0) {
    lines.push("", "🏆 Zone complète, plus rien à y trouver.");
  }

  return new EmbedBuilder()
    .setColor(pickColor(completion.percentage))
    .setTitle(`Progression — ${zone.label}`)
    .setDescription(lines.join("\n"))
    .setFooter({
      text: `${trainerName} • Un Pokémon peut vivre dans plusieurs zones : les pourcentages ne s'additionnent pas.`,
    });
}
