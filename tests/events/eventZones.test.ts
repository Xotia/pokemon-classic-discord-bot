import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const players: Record<string, any> = {};
const cannotCatch = vi.fn();

vi.mock("../../src/utils/logger", () => ({
  getLoggerForGuild: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));
vi.mock("../../src/config/guildSettings", () => ({
  getCooldownMs: () => 60 * 60 * 1000,
  getShinyRate: () => 256,
}));
vi.mock("../../src/utils/jsonPlayers", () => ({
  readPlayers: vi.fn(async () => players),
  updatePlayer: vi.fn(async () => undefined),
}));
vi.mock("../../src/methods/message/displayCannotCatchMessage", () => ({
  displayCannotCatchMessage: (...args: unknown[]) => cannotCatch(...args),
}));

import {
  findActiveEventZone,
  findEventZone,
  getEventCooldownFactor,
  getEventShinyRateFactor,
  getEventXpMultiplier,
  isActiveEventZone,
  listActiveEventZones,
  matchesEventZone,
} from "../../src/features/events/eventZones";
import {
  HALLOWEEN_ZONE_ID,
  HALLOWEEN_ZONE_LABEL,
  isHalloweenEventActive,
} from "../../src/features/halloweenEvent/halloweenEventConfig";
import {
  METEORITE_ZONE_ID,
  METEORITE_ZONE_LABEL,
} from "../../src/features/meteoriteEvent/meteoriteEventConfig";
import { checkIfUserCanCatch } from "../../src/methods/cooldown/checkIfUserCanCatch";
import { computeCaptureXp } from "../../src/methods/xp/computeCaptureXp";
import { isThePokemonGonnaBeShiny } from "../../src/methods/pokemon/isThePokemonGonnaBeShiny";

// Paris est en UTC+1 le 31 octobre 2026 : minuit Paris = 23h00 UTC la veille.
const BEFORE = new Date("2026-10-30T22:59:59Z");
const START = new Date("2026-10-30T23:00:00Z");
const LAST_SECOND = new Date("2026-10-31T22:59:59Z");
const AFTER = new Date("2026-10-31T23:00:00Z");
const DURING = new Date("2026-10-31T12:00:00Z");
const METEORITE_DAY = new Date("2026-08-11T12:00:00Z");
const NORMAL_DAY = new Date("2026-06-01T12:00:00Z");

beforeEach(() => {
  delete process.env.HALLOWEEN_EVENT_DEBUG;
  delete process.env.METEORITE_EVENT_DEBUG;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete process.env.HALLOWEEN_EVENT_DEBUG;
  delete process.env.METEORITE_EVENT_DEBUG;
});

describe("fenêtre de l'évènement Halloween", () => {
  it("respecte les bornes UTC (Paris UTC+1)", () => {
    expect(isHalloweenEventActive(BEFORE)).toBe(false);
    expect(isHalloweenEventActive(START)).toBe(true);
    expect(isHalloweenEventActive(LAST_SECOND)).toBe(true);
    expect(isHalloweenEventActive(AFTER)).toBe(false);
  });

  it("est forcée ouverte par HALLOWEEN_EVENT_DEBUG", () => {
    process.env.HALLOWEEN_EVENT_DEBUG = "1";
    expect(isHalloweenEventActive(NORMAL_DAY)).toBe(true);
  });
});

describe("registre des zones d'évènement", () => {
  it("retrouve une zone par id ou libellé, sans tenir compte de la casse", () => {
    expect(findEventZone(HALLOWEEN_ZONE_ID)?.zoneId).toBe(HALLOWEEN_ZONE_ID);
    expect(findEventZone("  MANOIR HANTÉ ")?.zoneId).toBe(HALLOWEEN_ZONE_ID);
    expect(findEventZone(METEORITE_ZONE_LABEL)?.zoneId).toBe(METEORITE_ZONE_ID);
    expect(matchesEventZone("volcano")).toBe(false);
    expect(findEventZone(HALLOWEEN_ZONE_LABEL)?.generationToken).toBe("multi-gen");
  });

  it("n'expose la zone que pendant sa fenêtre", () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURING);
    expect(isActiveEventZone(HALLOWEEN_ZONE_ID)).toBe(true);
    expect(findActiveEventZone(HALLOWEEN_ZONE_LABEL)?.zoneId).toBe(HALLOWEEN_ZONE_ID);
    expect(listActiveEventZones().map((z) => z.zoneId)).toEqual([HALLOWEEN_ZONE_ID]);

    vi.setSystemTime(NORMAL_DAY);
    expect(isActiveEventZone(HALLOWEEN_ZONE_ID)).toBe(false);
    expect(listActiveEventZones()).toEqual([]);
  });

  it("accepte une date explicite", () => {
    expect(isActiveEventZone(HALLOWEEN_ZONE_ID, START)).toBe(true);
    expect(isActiveEventZone(HALLOWEEN_ZONE_ID, AFTER)).toBe(false);
  });

  it("garde le comportement de la Météorite", () => {
    expect(getEventCooldownFactor(METEORITE_ZONE_ID, METEORITE_DAY)).toBe(0.5);
    expect(getEventXpMultiplier(METEORITE_ZONE_ID, METEORITE_DAY)).toBe(2);
    expect(getEventShinyRateFactor(METEORITE_ZONE_ID, METEORITE_DAY)).toBe(1);
    expect(getEventCooldownFactor(METEORITE_ZONE_ID, NORMAL_DAY)).toBe(1);
    expect(getEventXpMultiplier(METEORITE_ZONE_ID, NORMAL_DAY)).toBe(1);
  });
});

describe("facteurs du Manoir hanté", () => {
  it("applique les bonus dans le manoir pendant la fenêtre", () => {
    expect(getEventCooldownFactor(HALLOWEEN_ZONE_ID, DURING)).toBe(0.5);
    expect(getEventXpMultiplier(HALLOWEEN_ZONE_ID, DURING)).toBe(2);
    expect(getEventShinyRateFactor(HALLOWEEN_ZONE_ID, DURING)).toBe(3);
  });

  it("renvoie 1 hors fenêtre", () => {
    expect(getEventCooldownFactor(HALLOWEEN_ZONE_ID, BEFORE)).toBe(1);
    expect(getEventXpMultiplier(HALLOWEEN_ZONE_ID, AFTER)).toBe(1);
    expect(getEventShinyRateFactor(HALLOWEEN_ZONE_ID, AFTER)).toBe(1);
  });

  it("renvoie 1 hors du manoir, même pendant la fenêtre", () => {
    expect(getEventCooldownFactor("volcano", DURING)).toBe(1);
    expect(getEventXpMultiplier("volcano", DURING)).toBe(1);
    expect(getEventShinyRateFactor("volcano", DURING)).toBe(1);
    expect(getEventShinyRateFactor(undefined, DURING)).toBe(1);
    // La fenêtre Halloween n'active pas la Météorite
    expect(getEventXpMultiplier(METEORITE_ZONE_ID, DURING)).toBe(1);
  });

  it("calcule l'XP avec le multiplicateur de zone", () => {
    expect(computeCaptureXp(100, "legendary", false, getEventXpMultiplier(HALLOWEEN_ZONE_ID, DURING))).toBe(1500);
    expect(computeCaptureXp(100, "legendary", false, getEventXpMultiplier("volcano", DURING))).toBe(750);
  });
});

describe("chromatique", () => {
  // 1/256 = 0,0039 ; 3/256 = 0,0117
  it("garde le taux de base hors manoir et hors fenêtre", () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURING);
    vi.spyOn(Math, "random").mockReturnValue(0.008);
    expect(isThePokemonGonnaBeShiny("g", "volcano")).toBe(false);
    expect(isThePokemonGonnaBeShiny("g")).toBe(false);

    vi.setSystemTime(NORMAL_DAY);
    expect(isThePokemonGonnaBeShiny("g", HALLOWEEN_ZONE_ID)).toBe(false);
  });

  it("triple la chance dans le manoir pendant la fenêtre", () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURING);
    vi.spyOn(Math, "random").mockReturnValue(0.008);
    expect(isThePokemonGonnaBeShiny("g", HALLOWEEN_ZONE_ID)).toBe(true);

    vi.spyOn(Math, "random").mockReturnValue(0.02);
    expect(isThePokemonGonnaBeShiny("g", HALLOWEEN_ZONE_ID)).toBe(false);
  });

  it("garde le taux de base dans la zone météorite", () => {
    vi.useFakeTimers();
    vi.setSystemTime(METEORITE_DAY);
    vi.spyOn(Math, "random").mockReturnValue(0.008);
    expect(isThePokemonGonnaBeShiny("g", METEORITE_ZONE_ID)).toBe(false);
  });
});

describe("cooldown de capture", () => {
  const interaction = { user: { id: "u1", tag: "u1#0" } } as any;

  it("est divisé par deux dans le manoir pendant la fenêtre", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(DURING);
    // 40 min écoulées sur un cooldown d'1 h : bloqué ailleurs, libre dans le manoir
    players.u1 = { lastCapture: Date.now() - 40 * 60 * 1000 };

    cannotCatch.mockClear();
    expect(await checkIfUserCanCatch(interaction, "g", "volcano")).toBe(false);
    expect(cannotCatch).toHaveBeenCalledTimes(1);

    expect(await checkIfUserCanCatch(interaction, "g", HALLOWEEN_ZONE_ID)).toBe(true);
  });

  it("n'est pas réduit dans le manoir hors fenêtre", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NORMAL_DAY);
    players.u1 = { lastCapture: Date.now() - 40 * 60 * 1000 };
    expect(await checkIfUserCanCatch(interaction, "g", HALLOWEEN_ZONE_ID)).toBe(false);
  });
});
