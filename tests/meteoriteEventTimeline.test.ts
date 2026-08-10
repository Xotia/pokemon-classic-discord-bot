import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  EVENT_END,
  METEORITE_RAID_SLOTS,
  METEORITE_WARNING_DATE,
  isMeteoriteEventActive,
} from "../src/features/meteoriteEvent/meteoriteEventConfig";

// ⚠️ Ces attentes suivent la timeline configurée en dur dans
// meteoriteEventConfig.ts. Elles sont volontairement rigides : toute
// modification des dates de l'évènement doit faire échouer ce fichier et être
// répercutée ici dans le même commit.
const EVENT_DAY = "2026-08-11";

const originalDebugFlag = process.env.METEORITE_EVENT_DEBUG;

beforeEach(() => {
  delete process.env.METEORITE_EVENT_DEBUG;
});

afterEach(() => {
  if (originalDebugFlag === undefined) delete process.env.METEORITE_EVENT_DEBUG;
  else process.env.METEORITE_EVENT_DEBUG = originalDebugFlag;
});

describe("fenêtre de l'évènement météorite", () => {
  it("ouvre à 8h00 Paris et ferme à 23h59:59 le jour configuré", () => {
    expect(isMeteoriteEventActive(new Date(`${EVENT_DAY}T05:59:59Z`))).toBe(false);
    expect(isMeteoriteEventActive(new Date(`${EVENT_DAY}T06:00:00Z`))).toBe(true);
    expect(isMeteoriteEventActive(new Date(`${EVENT_DAY}T21:59:59Z`))).toBe(true);
    expect(isMeteoriteEventActive(new Date(`${EVENT_DAY}T22:00:00Z`))).toBe(false);
    expect(EVENT_END.toISOString()).toBe(`${EVENT_DAY}T21:59:59.000Z`);
  });

  it("reste fermée la veille et le lendemain", () => {
    expect(isMeteoriteEventActive(new Date("2026-08-10T12:00:00Z"))).toBe(false);
    expect(isMeteoriteEventActive(new Date("2026-08-12T12:00:00Z"))).toBe(false);
  });

  it("est forcée ouverte par METEORITE_EVENT_DEBUG", () => {
    process.env.METEORITE_EVENT_DEBUG = "1";
    expect(isMeteoriteEventActive(new Date("2026-01-01T00:00:00Z"))).toBe(true);
  });

  it("place l'alerte J-7 à 20h00 Paris", () => {
    expect(METEORITE_WARNING_DATE.toISOString()).toBe("2026-08-04T18:00:00.000Z");
  });
});

describe("créneaux de raid Deoxys", () => {
  it("suit les quatre horaires annoncés, dans l'ordre des formes", () => {
    expect(
      METEORITE_RAID_SLOTS.map((slot) => [
        slot.deoxysPokemonId,
        slot.openTime.toISOString(),
        slot.closeTime.toISOString(),
      ]),
    ).toEqual([
      [386, `${EVENT_DAY}T08:00:00.000Z`, `${EVENT_DAY}T10:00:00.000Z`],
      [4103, `${EVENT_DAY}T11:30:00.000Z`, `${EVENT_DAY}T13:30:00.000Z`],
      [4104, `${EVENT_DAY}T16:00:00.000Z`, `${EVENT_DAY}T18:00:00.000Z`],
      [4105, `${EVENT_DAY}T19:00:00.000Z`, `${EVENT_DAY}T21:00:00.000Z`],
    ]);
  });

  it("tient entièrement dans la fenêtre d'ouverture de la zone", () => {
    for (const slot of METEORITE_RAID_SLOTS) {
      expect(isMeteoriteEventActive(slot.openTime)).toBe(true);
      expect(isMeteoriteEventActive(slot.closeTime)).toBe(true);
    }
  });

  it("ne chevauche jamais deux raids", () => {
    // openRaidRegistration ignore une ouverture si un raid est déjà en
    // inscription : un chevauchement ferait silencieusement sauter un créneau.
    for (let i = 1; i < METEORITE_RAID_SLOTS.length; i++) {
      expect(METEORITE_RAID_SLOTS[i].openTime.getTime()).toBeGreaterThan(
        METEORITE_RAID_SLOTS[i - 1].closeTime.getTime(),
      );
    }
  });
});
