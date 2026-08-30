/**
 * Réglages du world boss. Contrairement au raid, ils ne sont PAS surchargeables
 * par serveur : l'événement est mondial, ses horaires aussi (voir la spec,
 * « Points volontairement écartés »).
 */

export const WORLD_BOSS_TIMEZONE = 'Europe/Paris';

/** Dimanche 12h00, ouverture des inscriptions. */
export function getWorldBossStartCron(): string {
  return process.env.WORLD_BOSS_START_CRON ?? '00 12 * * 0';
}

/** Dimanche 20h00, clôture et résolution. */
export function getWorldBossEndCron(): string {
  return process.env.WORLD_BOSS_END_CRON ?? '00 20 * * 0';
}

/** `debug` permet de tester sans attendre dimanche, comme `raidSchedulerMode`. */
export function getWorldBossSchedulerMode(): string {
  return process.env.WORLD_BOSS_SCHEDULER_MODE ?? process.env.RAID_SCHEDULER_MODE ?? 'debug';
}

function parseCronMinuteHour(cronExpression: string): { hour: number; minute: number } {
  const [minuteField, hourField] = cronExpression.trim().split(/\s+/);
  const minute = Number(minuteField);
  const hour = Number(hourField);
  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

/**
 * Durée de la fenêtre d'inscription, déduite des deux crons pour qu'un
 * changement d'horaire ne se règle qu'à un seul endroit. Une fenêtre qui
 * passerait minuit est ramenée sur 24h, comme pour le raid.
 */
export function getWorldBossRegistrationDurationMinutes(): number {
  const start = parseCronMinuteHour(getWorldBossStartCron());
  const end = parseCronMinuteHour(getWorldBossEndCron());
  const diff = end.hour * 60 + end.minute - (start.hour * 60 + start.minute);
  return diff > 0 ? diff : diff + 24 * 60;
}
