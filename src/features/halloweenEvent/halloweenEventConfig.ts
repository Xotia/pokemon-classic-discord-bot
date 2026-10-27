export const HALLOWEEN_ZONE_ID = "haunted-manor";
export const HALLOWEEN_ZONE_LABEL = "Manoir hanté";
// Comme la Météorite : la zone n'appartient à aucune génération.
export const HALLOWEEN_GENERATION_TOKEN = "multi-gen";

// Le 31 octobre 2026, Paris est en UTC+1 (heure d'hiver depuis le 25 octobre).
// Début : 31 octobre 00h00 Paris. Fin : 31 octobre 23h59:59 Paris.
const EVENT_START = new Date("2026-10-30T23:00:00Z");
const EVENT_END = new Date("2026-10-31T22:59:59Z");

export function isHalloweenEventActive(now = new Date()): boolean {
  if (process.env.HALLOWEEN_EVENT_DEBUG === "1") return true;
  return now >= EVENT_START && now <= EVENT_END;
}
