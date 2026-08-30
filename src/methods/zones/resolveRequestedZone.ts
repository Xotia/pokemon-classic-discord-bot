import { Zone } from "../../types/zones";
import { loadUnlockedZones } from "../../utils/loadUnlockedZones";
import { getAllZones } from "./getAllZones";
import {
  METEORITE_ZONE_ID,
  METEORITE_ZONE_LABEL,
  isMeteoriteEventActive,
  matchesMeteoriteZone,
} from "../../features/meteoriteEvent/meteoriteEventConfig";

export type ResolvedZone =
  | { status: "ok"; zone: Zone }
  | { status: "locked"; zone: Zone }
  | { status: "unknown" };

function matches(zone: Zone, input: string): boolean {
  return (
    zone.id.toLowerCase() === input || zone.label.toLowerCase() === input
  );
}

/**
 * Résout une zone saisie par le joueur (id renvoyé par l'autocomplétion, ou
 * libellé tapé à la main) en appliquant la même visibilité que /capture :
 * seules les zones débloquées sur le serveur sont consultables, plus la zone
 * d'événement tant que l'événement est actif.
 */
export function resolveRequestedZone(guildId: string, rawInput: string): ResolvedZone {
  const input = rawInput.trim().toLowerCase();
  if (!input) return { status: "unknown" };

  if (matchesMeteoriteZone(input) && isMeteoriteEventActive()) {
    return {
      status: "ok",
      zone: { id: METEORITE_ZONE_ID, label: METEORITE_ZONE_LABEL },
    };
  }

  const unlockedZones = Object.values(loadUnlockedZones(guildId)).flat();
  const unlocked = unlockedZones.find((zone) => matches(zone, input));
  if (unlocked) return { status: "ok", zone: unlocked };

  const known = getAllZones().find((zone) => matches(zone, input));
  if (known) return { status: "locked", zone: known };

  return { status: "unknown" };
}
