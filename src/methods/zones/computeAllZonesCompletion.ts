import { Player } from "../../types/Player";
import { Zone } from "../../types/zones";
import { loadUnlockedZones } from "../../utils/loadUnlockedZones";
import {
  METEORITE_ZONE_ID,
  METEORITE_ZONE_LABEL,
  isMeteoriteEventActive,
} from "../../features/meteoriteEvent/meteoriteEventConfig";
import { ZoneCompletion, computeZoneCompletion } from "./computeZoneCompletion";

export interface ZoneCompletionEntry {
  zone: Zone;
  completion: ZoneCompletion;
}

export interface GenerationCompletion {
  /** Clé de génération (`gen1`, `gen2`, …) ou `event` pour la zone d'événement. */
  generation: string;
  zones: ZoneCompletionEntry[];
}

function generationOrder(generation: string): number {
  const match = /^gen(\d+)$/.exec(generation);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

/**
 * Avancement du joueur sur TOUTES les zones consultables du serveur, groupé par
 * génération et dans l'ordre de déblocage.
 *
 * Même visibilité que `resolveRequestedZone` : uniquement les zones débloquées,
 * plus la zone d'événement tant que l'événement est actif. Une zone débloquée
 * mais vide de Pokémon est écartée, elle n'a pas de ratio à afficher.
 */
export function computeAllZonesCompletion(
  guildId: string,
  player: Player | null,
): GenerationCompletion[] {
  const unlockedZones = loadUnlockedZones(guildId);

  const groups: GenerationCompletion[] = Object.entries(unlockedZones)
    .sort(([a], [b]) => generationOrder(a) - generationOrder(b))
    .map(([generation, zones]) => ({
      generation,
      zones: zones
        .map((zone) => ({
          zone,
          completion: computeZoneCompletion(guildId, player, zone.id),
        }))
        .filter((entry) => entry.completion.total > 0),
    }))
    .filter((group) => group.zones.length > 0);

  if (isMeteoriteEventActive()) {
    const zone: Zone = { id: METEORITE_ZONE_ID, label: METEORITE_ZONE_LABEL };
    const completion = computeZoneCompletion(guildId, player, zone.id);
    if (completion.total > 0) {
      groups.push({ generation: "event", zones: [{ zone, completion }] });
    }
  }

  return groups;
}
