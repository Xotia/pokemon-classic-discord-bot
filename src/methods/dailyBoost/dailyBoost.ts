export const DAILY_BOOST_TIMEZONE = "Europe/Paris";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DAILY_BOOST_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Jour calendaire (YYYY-MM-DD) à l'heure de Paris : le boost se recharge à minuit Paris.
export function getDayKey(date: Date = new Date()): string {
  return dayKeyFormatter.format(date);
}

export function isDailyBoostAvailable(player: any, date: Date = new Date()): boolean {
  return player.lastDailyBoostDay !== getDayKey(date);
}
