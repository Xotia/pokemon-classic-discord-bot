import type { EmbedBuilder } from 'discord.js';
import { buildEmbed } from '../../methods/embed/buildEmbed';
import { formatMissingStats } from './worldBossEmbedFormat';
import { groupDefendersByGuild } from './buildWorldBossTeamEmbed';
import { formatWorldBossPortalName } from './worldBossPortalTier';
import { WorldBossState } from '../../types/worldBoss/WorldBossState';

const VICTORY_COLOR = 0x2ecc71;
const DEFEAT_COLOR = 0xe74c3c;

/**
 * Résultat du combat, diffusé partout. La victoire annonce le portail scellé ;
 * la défaite s'arrête à ce qui a manqué, sans commentaire sur la suite. Le
 * retrait du boss du vivier reste journalisé, jamais exposé aux joueurs.
 */
export function buildWorldBossResultEmbed(state: WorldBossState): EmbedBuilder {
  const { result, boss, reward } = state;

  if (!result || !boss) {
    return buildEmbed(
      'Résultat du world boss',
      '',
      0x999999,
      'Données de résultat indisponibles.',
      `World boss ${state.worldBossId}`,
    );
  }

  const guildsCount = result.guildsCount || groupDefendersByGuild(state.defenders).length;

  const parts: string[] = [
    `**Participants :** ${result.participantsCount}`,
    `**Serveurs représentés :** ${guildsCount}`,
    `**Portail :** ${formatWorldBossPortalName(boss.difficulty)}`,
  ];

  if (result.success) {
    parts.push('');
    parts.push(
      `Le **${formatWorldBossPortalName(boss.difficulty)}** se referme derrière l'équipe.`,
    );

    if (reward && reward.rewardPerPlayer > 0) {
      parts.push('');
      parts.push('**Récompenses, pour chaque participant, sur son serveur :**');
      parts.push(`🏆 +${reward.rewardPerPlayer} XP`);
      parts.push(`🔬 +${reward.rewardPerPlayer} données de recherche`);
    }
  } else if (result.participantsCount === 0) {
    parts.push('');
    parts.push('Personne n’a franchi le portail.');
  } else if (result.missingStats.length > 0) {
    parts.push('');
    parts.push(`L'équipe mondiale manquait de : **${formatMissingStats(result.missingStats)}**.`);
  }

  return buildEmbed(
    result.success
      ? `🎉 Victoire ! ${boss.name} a été vaincu de l'autre côté du portail !`
      : `💀 Défaite... ${boss.name} n'a pas été vaincu.`,
    boss.sprite,
    result.success ? VICTORY_COLOR : DEFEAT_COLOR,
    parts.join('\n'),
    `World boss ${state.worldBossId}`,
  );
}
