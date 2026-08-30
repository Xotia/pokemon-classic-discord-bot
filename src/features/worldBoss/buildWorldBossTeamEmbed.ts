import type { EmbedBuilder, EmbedField } from 'discord.js';
import { buildEmbed } from '../../methods/embed/buildEmbed';
import { getTypeLabel } from '../../config/typeLabels';
import {
  DISCORD_MAX_FIELDS,
  formatParisTime,
  joinLinesWithinLimit,
} from './worldBossEmbedFormat';
import {
  formatWorldBossPortalName,
  formatWorldBossPortalTier,
  getWorldBossPortalTier,
} from './worldBossPortalTier';
import { WorldBossDefender } from '../../types/worldBoss/WorldBossDefender';
import { WorldBossState } from '../../types/worldBoss/WorldBossState';

/** Champs d'en-tête (éclat, inscrits, serveurs) toujours présents. */
const HEADER_FIELDS_COUNT = 3;
const MAX_GUILD_FIELDS = DISCORD_MAX_FIELDS - HEADER_FIELDS_COUNT;

type GuildGroup = {
  guildId: string;
  guildName: string;
  defenders: WorldBossDefender[];
};

export function groupDefendersByGuild(defenders: WorldBossDefender[]): GuildGroup[] {
  const groups = new Map<string, GuildGroup>();

  for (const defender of defenders) {
    const group = groups.get(defender.guildId) ?? {
      guildId: defender.guildId,
      guildName: defender.guildName || defender.guildId,
      defenders: [],
    };
    group.defenders.push(defender);
    groups.set(defender.guildId, group);
  }

  return [...groups.values()].sort(
    (a, b) => b.defenders.length - a.defenders.length || a.guildName.localeCompare(b.guildName),
  );
}

function formatDefenderLine(defender: WorldBossDefender): string {
  // `displayName` est celui figé à l'inscription : guild.members.fetch() ne
  // traverse pas les serveurs, un fetch ici échouerait pour la majorité de
  // l'équipe.
  return `${defender.displayName} — ${defender.pokemonName} (${getTypeLabel(defender.attackType)})`;
}

/**
 * Équipe mondiale groupée par serveur. Au-delà du plafond de 25 champs, les
 * derniers serveurs sont regroupés dans un champ de synthèse plutôt que
 * disparaître silencieusement.
 */
export function buildWorldBossTeamEmbed(state: WorldBossState): EmbedBuilder {
  const boss = state.boss;

  if (!boss) {
    const nextInfo = "Le prochain portail s'ouvre dimanche à 12h00 (Paris).";
    return buildEmbed(
      '🌀 Équipe mondiale',
      '',
      0x999999,
      `Aucun world boss n'est actif pour le moment.\n${nextInfo}`,
      'Aucun world boss actif',
    );
  }

  const groups = groupDefendersByGuild(state.defenders);
  const closeTime = state.registrationClosesAt
    ? `${formatParisTime(state.registrationClosesAt)} (Paris)`
    : 'Inconnue';

  const fields: EmbedField[] = [
    { name: 'Portail', value: formatWorldBossPortalTier(boss.difficulty), inline: true },
    { name: 'Inscrits', value: `${state.defenders.length}`, inline: true },
    {
      name: 'Serveurs représentés',
      value: `${groups.length}`,
      inline: true,
    },
  ];

  if (groups.length === 0) {
    fields.push({
      name: 'Équipe de défense',
      value: 'Aucun défenseur inscrit pour le moment.',
      inline: false,
    });
  } else {
    const shown = groups.length > MAX_GUILD_FIELDS ? groups.slice(0, MAX_GUILD_FIELDS - 1) : groups;

    for (const group of shown) {
      fields.push({
        name: `${group.guildName} (${group.defenders.length})`,
        value: joinLinesWithinLimit(group.defenders.map(formatDefenderLine)),
        inline: false,
      });
    }

    const remaining = groups.slice(shown.length);
    if (remaining.length > 0) {
      const remainingDefenders = remaining.reduce(
        (total, group) => total + group.defenders.length,
        0,
      );
      fields.push({
        name: `${remaining.length} autre(s) serveur(s)`,
        value: joinLinesWithinLimit(
          remaining.map((group) => `${group.guildName} — ${group.defenders.length} défenseur(s)`),
        ).concat(`\n**Total : ${remainingDefenders} défenseur(s)**`),
        inline: false,
      });
    }
  }

  const description = [
    `Un **${formatWorldBossPortalName(boss.difficulty)}** est ouvert. De l'autre côté : **${boss.name}**.`,
    `Type d'attaque : **${getTypeLabel(boss.attackType)}**`,
    `Fin des inscriptions : **${closeTime}**`,
  ].join('\n');

  return buildEmbed(
    '👊 Équipe mondiale engagée',
    boss.sprite,
    getWorldBossPortalTier(boss.difficulty).color,
    description,
    `World boss ${state.worldBossId}`,
    fields,
  );
}
