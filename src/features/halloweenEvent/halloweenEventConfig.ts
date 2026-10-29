export const HALLOWEEN_ZONE_ID = "haunted-manor";
export const HALLOWEEN_ZONE_LABEL = "Manoir hanté";
// Comme la Météorite : la zone n'appartient à aucune génération.
export const HALLOWEEN_GENERATION_TOKEN = "multi-gen";

// Le 31 octobre 2026, Paris est en UTC+1 (heure d'hiver depuis le 25 octobre).
// Début : 31 octobre 00h00 Paris. Fin : 31 octobre 23h59:59 Paris.
export const EVENT_START = new Date("2026-10-30T23:00:00Z");
export const EVENT_END = new Date("2026-10-31T22:59:59Z");

export function isHalloweenEventActive(now = new Date()): boolean {
  if (process.env.HALLOWEEN_EVENT_DEBUG === "1") return true;
  return now >= EVENT_START && now <= EVENT_END;
}

// World Boss d'Halloween (global, un seul pour tous les serveurs). Samedi 31
// octobre 2026, Paris en UTC+1. Le World Boss hebdomadaire est le dimanche,
// donc aucun chevauchement. À modifier ici pour changer l'horaire.
// Ectoplasma Gigamax : entrée normale du catalogue, non eventOnly (il reste dans
// le vivier hebdomadaire ; vaincu le 31, il en sort par la règle habituelle).
export const HALLOWEEN_WORLD_BOSS_ID = "wb-008-gengar-gmax";

// Raid quotidien du 31 octobre, dans chaque serveur : Darkrai (#491).
export const HALLOWEEN_RAID_POKEMON_ID = 491;
// Ouverture des inscriptions : 31 octobre 18h00 Paris.
export const HALLOWEEN_WORLD_BOSS_OPEN = new Date("2026-10-31T17:00:00Z");
// Clôture et résolution : 31 octobre 23h00 Paris.
export const HALLOWEEN_WORLD_BOSS_CLOSE = new Date("2026-10-31T22:00:00Z");

// Annonce d'avance : 30 octobre 18h00 Paris (UTC+1, heure d'hiver).
export const HALLOWEEN_WARNING_DATE = new Date("2026-10-30T17:00:00Z");
