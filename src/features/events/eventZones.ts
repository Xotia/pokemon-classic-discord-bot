import {
  isMeteoriteEventActive,
  METEORITE_GENERATION_TOKEN,
  METEORITE_XP_MULTIPLIER,
  METEORITE_ZONE_ID,
  METEORITE_ZONE_LABEL,
} from "../meteoriteEvent/meteoriteEventConfig";
import {
  HALLOWEEN_GENERATION_TOKEN,
  HALLOWEEN_ZONE_ID,
  HALLOWEEN_ZONE_LABEL,
  isHalloweenEventActive,
} from "../halloweenEvent/halloweenEventConfig";

export interface EventZone {
  zoneId: string;
  label: string;
  generationToken: string;
  isActive(now?: Date): boolean;
  /** Multiplie le cooldown de capture (0.5 = cooldown divisé par deux). */
  cooldownFactor: number;
  xpMultiplier: number;
  /** Multiplie la chance de chromatique (3 = trois fois plus de chances). */
  shinyRateFactor: number;
}

// Les constantes de la Météorite sont lues paresseusement (accesseurs) : une
// lecture à l'import casserait les modules qui ne chargent qu'une partie de
// meteoriteEventConfig.
const EVENT_ZONES: EventZone[] = [
  {
    zoneId: METEORITE_ZONE_ID,
    label: METEORITE_ZONE_LABEL,
    get generationToken() {
      return METEORITE_GENERATION_TOKEN;
    },
    isActive: (now) => isMeteoriteEventActive(now),
    cooldownFactor: 0.5,
    get xpMultiplier() {
      return METEORITE_XP_MULTIPLIER;
    },
    shinyRateFactor: 1,
  },
  {
    zoneId: HALLOWEEN_ZONE_ID,
    label: HALLOWEEN_ZONE_LABEL,
    generationToken: HALLOWEEN_GENERATION_TOKEN,
    isActive: (now) => isHalloweenEventActive(now),
    cooldownFactor: 0.5,
    xpMultiplier: 2,
    shinyRateFactor: 3,
  },
];

export function findEventZone(input: string): EventZone | undefined {
  const normalized = input.trim().toLowerCase();
  return EVENT_ZONES.find(
    (zone) =>
      zone.zoneId.toLowerCase() === normalized ||
      zone.label.toLowerCase() === normalized,
  );
}

export function matchesEventZone(input: string): boolean {
  return findEventZone(input) !== undefined;
}

/**
 * Zone d'évènement reconnue uniquement pendant son évènement : hors fenêtre,
 * elle n'est ni accessible ni bonifiée.
 */
export function findActiveEventZone(input: string, now?: Date): EventZone | undefined {
  const zone = findEventZone(input);
  return zone?.isActive(now) ? zone : undefined;
}

export function isActiveEventZone(input: string, now?: Date): boolean {
  return findActiveEventZone(input, now) !== undefined;
}

export function listActiveEventZones(now?: Date): EventZone[] {
  return EVENT_ZONES.filter((zone) => zone.isActive(now));
}

// Hors zone d'évènement ou hors fenêtre : aucun bonus, donc facteur neutre.
export function getEventCooldownFactor(zoneId?: string, now?: Date): number {
  return (zoneId && findActiveEventZone(zoneId, now)?.cooldownFactor) || 1;
}

export function getEventXpMultiplier(zoneId?: string, now?: Date): number {
  return (zoneId && findActiveEventZone(zoneId, now)?.xpMultiplier) || 1;
}

export function getEventShinyRateFactor(zoneId?: string, now?: Date): number {
  return (zoneId && findActiveEventZone(zoneId, now)?.shinyRateFactor) || 1;
}
