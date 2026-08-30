import type { EmbedBuilder } from 'discord.js';
import { buildEmbed } from '../../methods/embed/buildEmbed';
import { getTypeLabel } from '../../config/typeLabels';
import { formatParisTime } from './worldBossEmbedFormat';
import { formatWorldBossPortalName, getWorldBossPortalTier } from './worldBossPortalTier';
import { WorldBossState } from '../../types/worldBoss/WorldBossState';

/**
 * Annonce d'ouverture, diffusée à l'identique dans tous les serveurs.
 *
 * Message court et factuel : la couleur du portail porte la menace, l'appel
 * aux centres de recherche porte le caractère mondial. Ni lore de boss, ni nom
 * de brèche, ni phrase d'ambiance — ils diluaient l'information utile.
 */
export function buildWorldBossAnnouncementEmbed(state: WorldBossState): EmbedBuilder {
  const boss = state.boss;

  if (!boss) {
    return buildEmbed(
      'World boss',
      '',
      0x999999,
      "Aucun portail n'est ouvert pour le moment.",
      'Aucun world boss actif',
    );
  }

  const closeTime = state.registrationClosesAt
    ? formatParisTime(state.registrationClosesAt)
    : 'Inconnue';
  const tier = getWorldBossPortalTier(boss.difficulty);

  const description = [
    `Les premières analyses y ont révélé la présence d'un **${boss.name}**.`,
    "Il faut le vaincre avant qu'il ne franchisse le portail à son tour : de ce côté-ci, ce sont les centres de recherche qui encaisseraient.",
    '',
    'Les dresseurs de l’ensemble des centres de recherche du monde sont appelés à se mobiliser : de l’autre côté, tous les portails débouchent au même endroit, sur le même combat.',
    '',
    `**Type :** ${boss.types.map((type) => getTypeLabel(type)).join(' / ')}`,
    `**Type d'attaque :** ${getTypeLabel(boss.attackType)}`,
    '',
    'Pour franchir le portail : `/world-boss <pokemon> [type]`',
    '',
    `**Fin des inscriptions :** ${closeTime} (Paris)`,
  ].join('\n');

  return buildEmbed(
    `🌀 Un ${formatWorldBossPortalName(boss.difficulty)} s'est ouvert au-dessus du centre de recherche !`,
    boss.sprite,
    tier.color,
    description,
    `World boss ${state.worldBossId}`,
  );
}
