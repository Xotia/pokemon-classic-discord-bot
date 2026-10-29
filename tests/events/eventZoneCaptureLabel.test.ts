import { describe, expect, it } from "vitest";

import { buildDescriptionForPokemonCaptureEmbed } from "../../src/methods/embed/buildDescriptionForRandomCaptureEmbed";
import { HALLOWEEN_ZONE_ID } from "../../src/features/halloweenEvent/halloweenEventConfig";
import { METEORITE_ZONE_ID } from "../../src/features/meteoriteEvent/meteoriteEventConfig";

const describeCapture = (zone: string) =>
  buildDescriptionForPokemonCaptureEmbed({
    guildId: "event-zone-label-test",
    pokemon: { id: 607, name: "Funécire", types: ["ghost", "fire"] } as any,
    isShiny: false,
    isNewPokemon: false,
    trainerName: "Xotia",
    zone,
  });

// Les zones d'évènement ne sont dans aucun fichier de zones : sans le
// registre, l'embed affichait l'id brut (« haunted-manor »).
describe("libellé de zone dans l'embed de capture", () => {
  it("affiche « Manoir hanté » pour la zone d'Halloween", () => {
    expect(describeCapture(HALLOWEEN_ZONE_ID)).toContain("📍 Zone : **Manoir hanté**");
  });

  it("affiche le libellé de la zone Météorite", () => {
    expect(describeCapture(METEORITE_ZONE_ID)).toContain("📍 Zone : **Cratère de la Météorite**");
  });
});
