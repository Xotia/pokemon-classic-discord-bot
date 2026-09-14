import { describe, expect, it } from "vitest";
import zonesAll from "../../data/zones_all.json";
import zonesToUnlockDefault from "../../data/zones_to_unlock.default.json";
import zonesUnlockedDefault from "../../data/zones_unlocked.default.json";
import { METEORITE_ZONE_ID } from "../../src/features/meteoriteEvent/meteoriteEventConfig";

type ZonesDb = Record<string, { id: string; label: string }[]>;

function generationZoneIds(db: ZonesDb): string[] {
  return Object.entries(db)
    .filter(([key]) => /^gen\d+$/.test(key))
    .flatMap(([, zones]) => zones.map((zone) => zone.id));
}

describe("zone d'évènement météorite", () => {
  // Le 13/09, la zone figurait dans la progression gen3 : un raid l'a tirée
  // comme prochaine zone et sa victoire l'a débloquée hors évènement.
  it.each([
    ["zones_all.json", zonesAll],
    ["zones_to_unlock.default.json", zonesToUnlockDefault],
    ["zones_unlocked.default.json", zonesUnlockedDefault],
  ])("n'appartient à aucune génération dans %s", (_file, db) => {
    expect(generationZoneIds(db as ZonesDb)).not.toContain(METEORITE_ZONE_ID);
  });

  it("reste déclarée comme zone d'évènement", () => {
    expect((zonesAll as ZonesDb).event.map((zone) => zone.id)).toContain(METEORITE_ZONE_ID);
  });
});
