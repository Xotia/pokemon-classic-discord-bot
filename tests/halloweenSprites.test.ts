import { beforeEach, describe, expect, it, vi } from "vitest";

const catalog = {
  "92": { image: "https://img/halloween-92.png", shinyImage: "https://img/halloween-92-shiny.png" },
  "93": { image: "https://img/halloween-93.png" },
};

vi.mock("node:fs", () => ({
  default: { readFileSync: () => JSON.stringify(catalog) },
}));

import { getEventSprite, resetHalloweenSpritesCache } from "../src/features/halloweenEvent/halloweenSprites";

const DURING = new Date("2026-10-31T12:00:00Z");
const OUTSIDE = new Date("2026-10-29T12:00:00Z");

beforeEach(() => {
  delete process.env.HALLOWEEN_EVENT_DEBUG;
  resetHalloweenSpritesCache();
});

describe("getEventSprite", () => {
  it("renvoie le sprite surchargé pendant l'évènement", () => {
    expect(getEventSprite({ id: 92 }, false, DURING)).toBe("https://img/halloween-92.png");
  });

  it("renvoie la variante chromatique pour un chromatique", () => {
    expect(getEventSprite({ id: 92 }, true, DURING)).toBe("https://img/halloween-92-shiny.png");
  });

  it("renvoie undefined hors évènement", () => {
    expect(getEventSprite({ id: 92 }, false, OUTSIDE)).toBeUndefined();
  });

  it("renvoie undefined pour un id sans surcharge", () => {
    expect(getEventSprite({ id: 1 }, false, DURING)).toBeUndefined();
  });

  it("renvoie undefined si la variante demandée n'existe pas", () => {
    expect(getEventSprite({ id: 93 }, true, DURING)).toBeUndefined();
  });
});
