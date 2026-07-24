export const METEORITE_ZONE_ID = "meteorite-crater";
export const METEORITE_ZONE_LABEL = "Cratère de la Météorite";
export const METEORITE_GENERATION_TOKEN = "multi-gen";
export const METEORITE_XP_MULTIPLIER = 2;

// Alerte envoyée J-7 : 8 août 2026 à 20h00 Paris (CEST = UTC+2)
export const METEORITE_WARNING_DATE = new Date("2026-08-08T18:00:00Z");
// Crash à 8h00 Paris le 15 août — zone accessible dès cet instant
const EVENT_START = new Date("2026-08-15T06:00:00Z");
export const EVENT_END = new Date("2026-08-15T21:59:59Z"); // 23h59:59 Paris

export function isMeteoriteEventActive(now = new Date()): boolean {
  if (process.env.METEORITE_EVENT_DEBUG === "1") return true;
  return now >= EVENT_START && now <= EVENT_END;
}

export function matchesMeteoriteZone(input: string): boolean {
  return (
    input.trim().toLowerCase() === METEORITE_ZONE_ID.toLowerCase() ||
    input.trim().toLowerCase() === METEORITE_ZONE_LABEL.toLowerCase()
  );
}

export interface MeteoriteRaidSlot {
  openTime: Date;
  closeTime: Date;
  deoxysPokemonId: number;
  label: string;
}

// Deoxys ids:
// 386 = Forme Normale (id national officiel, dans pokemon-gen3.json)
// 4103–4105 = formes Attaque/Défense/Speed (ids custom, dans pokemon-gen3.json)
export const METEORITE_RAID_SLOTS: MeteoriteRaidSlot[] = [
  {
    openTime: new Date("2026-08-15T08:00:00Z"),
    closeTime: new Date("2026-08-15T10:00:00Z"),
    deoxysPokemonId: 386,
    label: "Deoxys (Forme Normale)",
  },
  {
    openTime: new Date("2026-08-15T11:30:00Z"),
    closeTime: new Date("2026-08-15T13:30:00Z"),
    deoxysPokemonId: 4103,
    label: "Deoxys (Forme Attaque)",
  },
  {
    openTime: new Date("2026-08-15T16:00:00Z"),
    closeTime: new Date("2026-08-15T18:00:00Z"),
    deoxysPokemonId: 4104,
    label: "Deoxys (Forme Défense)",
  },
  {
    openTime: new Date("2026-08-15T19:00:00Z"),
    closeTime: new Date("2026-08-15T21:00:00Z"),
    deoxysPokemonId: 4105,
    label: "Deoxys (Forme Vitesse)",
  },
];
