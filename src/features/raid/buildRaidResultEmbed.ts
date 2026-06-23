import { EmbedBuilder } from "discord.js";
import { RaidState } from "../../types/raid/RaidState";
import { RaidStats } from "../../types/raid/RaidStats";
import { getTypeLabel } from "../../config/typeLabels";

const STAT_LABELS: Record<keyof RaidStats, string> = {
  hp: "PV",
  attack: "Attaque",
  defense: "Défense",
  specialAttack: "Attaque Spé.",
  specialDefense: "Défense Spé.",
  speed: "Vitesse",
};

function formatMissingStats(missingStats: string[]): string {
  const labels = missingStats
    .map((stat) => STAT_LABELS[stat as keyof RaidStats])
    .filter(Boolean);

  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  return labels.slice(0, -1).join(", ") + " et " + labels[labels.length - 1];
}

export function buildRaidResultEmbed(state: RaidState): EmbedBuilder {
  const result = state.result;
  const boss = state.raidPokemon;

  if (!result || !boss) {
    return new EmbedBuilder()
      .setTitle("Résultat du raid")
      .setDescription("Données de résultat indisponibles.")
      .setColor(0x999999);
  }

  const title = result.success
    ? `🎉 Victoire ! ${boss.name} a été repoussé !`
    : `💀 Défaite... ${boss.name} a ravagé le centre de recherche.`;

  const color = result.success ? 0x2ecc71 : 0xe74c3c;

  const parts: string[] = [
    `**Participants :** ${result.participantsCount}`,
    `**Difficulté :** ${boss.difficulty}/5`,
  ];

  if (!result.success) {
    parts.push("");
    if (result.participantsCount === 0) {
      parts.push("Personne n'a participé à la défense du centre de recherche.");
    } else if (result.missingStats.length > 0) {
      const missing = formatMissingStats(result.missingStats);
      parts.push(`L'équipe de défense manquait de : **${missing}**.`);
    }
  }

  if (result.success && state.reward) {
    parts.push("");
    parts.push("**Récompenses :**");
    parts.push(`🏆 +${state.reward.xp} XP pour chaque participant`);
    if (state.reward.zoneUnlocked) {
      parts.push(`🗺️ Nouvelle zone débloquée : **${state.reward.zoneUnlocked}**`);
    }
    if (state.reward.capturedByPlayerName) {
      parts.push(`📦 C'est **${state.reward.capturedByPlayerName}** qui a reussi la capture du **${boss.name}** enragé !`);
    }
  }

  const defenderList = state.defenders.length > 0
    ? state.defenders.map((d) => `${d.pokemonName} (${getTypeLabel(d.attackType)})`).join(", ")
    : "Aucun";

  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(parts.join("\n"))
    .setColor(color)
    .addFields({ name: "Équipe de défense", value: defenderList })
    .setFooter({ text: `Raid ID: ${state.raidId}` })
    .setTimestamp();
}
