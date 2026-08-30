import { WorldBossStats } from '../../types/worldBoss/WorldBossStats';

/** Plafond Discord : 25 champs par embed, 1024 caractères par valeur. */
export const DISCORD_MAX_FIELDS = 25;
export const DISCORD_MAX_FIELD_VALUE = 1024;

export const WORLD_BOSS_STAT_LABELS: Record<keyof WorldBossStats, string> = {
  hp: 'PV',
  attack: 'Attaque',
  defense: 'Défense',
  specialAttack: 'Attaque Spé.',
  specialDefense: 'Défense Spé.',
  speed: 'Vitesse',
};

export const WORLD_BOSS_STAT_ORDER: (keyof WorldBossStats)[] = [
  'hp',
  'attack',
  'defense',
  'specialAttack',
  'specialDefense',
  'speed',
];

export function formatWorldBossStats(stats: WorldBossStats): string {
  return WORLD_BOSS_STAT_ORDER.map(
    (stat) => `${WORLD_BOSS_STAT_LABELS[stat]} : **${Math.round(stats[stat])}**`,
  ).join('\n');
}

export function formatStatDiffs(statDiffs: WorldBossStats): string {
  return WORLD_BOSS_STAT_ORDER.filter((stat) => stat !== 'hp')
    .map((stat) => {
      const diff = Math.round(statDiffs[stat]);
      const sign = diff >= 0 ? '+' : '';
      return `${WORLD_BOSS_STAT_LABELS[stat]} : **${sign}${diff}**`;
    })
    .join('\n');
}

export function formatMissingStats(missingStats: string[]): string {
  const labels = missingStats
    .map((stat) => WORLD_BOSS_STAT_LABELS[stat as keyof WorldBossStats])
    .filter(Boolean);

  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} et ${labels[labels.length - 1]}`;
}

/**
 * Assemble des lignes sous le plafond Discord en disant combien ont été
 * écartées. Tronquer en silence ferait disparaître des joueurs de l'équipe
 * affichée sans que personne ne le remarque.
 */
export function joinLinesWithinLimit(
  lines: string[],
  limit: number = DISCORD_MAX_FIELD_VALUE,
): string {
  if (lines.length === 0) return '—';

  const kept: string[] = [];
  let length = 0;

  for (let index = 0; index < lines.length; index++) {
    const remaining = lines.length - index;
    const overflowNotice = `… et ${remaining} autre(s)`;
    const candidateLength = length + lines[index].length + (kept.length > 0 ? 1 : 0);

    // On garde de quoi écrire la mention de débordement si la suite ne rentre pas.
    if (candidateLength > limit - (remaining > 1 ? overflowNotice.length + 1 : 0)) {
      kept.push(`… et ${remaining} autre(s)`);
      return kept.join('\n');
    }

    kept.push(lines[index]);
    length = candidateLength;
  }

  return kept.join('\n');
}

export function formatParisTime(isoDate: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));
}
