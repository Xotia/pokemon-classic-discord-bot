import { EmbedBuilder } from "discord.js";
import { GenerationCompletion } from "../zones/computeAllZonesCompletion";

const BAR_LENGTH = 10;

const GENERATION_LABELS: Record<string, string> = {
  gen1: "Kanto",
  gen2: "Johto",
  gen3: "Hoenn",
  event: "Événement",
};

function generationLabel(generation: string): string {
  return GENERATION_LABELS[generation] ?? generation;
}

/**
 * Barre courte (10 blocs) : un arrondi seul rendrait une barre vide à 4 % et une
 * barre pleine à 96 %, deux états visuellement identiques à 0 % et 100 % alors
 * que la vue d'ensemble sert justement à repérer les zones entamées et finies.
 */
function buildProgressBar(percentage: number): string {
  const raw = Math.round((percentage / 100) * BAR_LENGTH);
  let filled = raw;
  if (percentage > 0) filled = Math.max(1, filled);
  if (percentage < 100) filled = Math.min(BAR_LENGTH - 1, filled);
  return "█".repeat(filled) + "░".repeat(BAR_LENGTH - filled);
}

function pickColor(percentage: number): number {
  if (percentage >= 100) return 0xf1c40f;
  if (percentage >= 75) return 0x2ecc71;
  if (percentage >= 40) return 0x3498db;
  return 0x95a5a6;
}

/**
 * Vue d'ensemble : une ligne par zone consultable, groupée par génération.
 *
 * Pas de pourcentage global : un Pokémon peut vivre dans plusieurs zones, un
 * total agrégé le compterait plusieurs fois et ne voudrait rien dire. Le seul
 * chiffre transverse affiché est le nombre de zones terminées.
 */
export function buildZonesOverviewEmbed(
  trainerName: string,
  groups: GenerationCompletion[],
): EmbedBuilder {
  const allZones = groups.flatMap((group) => group.zones);
  const completedCount = allZones.filter(
    (entry) => entry.completion.captured === entry.completion.total,
  ).length;
  const averagePercentage =
    Math.round(
      (allZones.reduce((sum, entry) => sum + entry.completion.percentage, 0) /
        allZones.length) *
        10,
    ) / 10;

  const lines: string[] = [];

  for (const group of groups) {
    lines.push(`__**${generationLabel(group.generation)}**__`);
    for (const { zone, completion } of group.zones) {
      const done = completion.captured === completion.total ? " 🏆" : "";
      lines.push(
        `\`${buildProgressBar(completion.percentage)}\` **${completion.percentage} %** · ` +
          `${zone.label} (${completion.captured}/${completion.total})${done}`,
      );
    }
    lines.push("");
  }

  lines.push(
    `📗 **Zones terminées :** ${completedCount} / ${allZones.length}`,
    `📊 **Moyenne des zones :** ${averagePercentage} %`,
  );

  return new EmbedBuilder()
    .setColor(pickColor(averagePercentage))
    .setTitle("Progression — toutes les zones")
    .setDescription(lines.join("\n"))
    .setFooter({
      text: `${trainerName} • Captures de la saison en cours. Un Pokémon peut vivre dans plusieurs zones : les pourcentages ne s'additionnent pas.`,
    });
}
