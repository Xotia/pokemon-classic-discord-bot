import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/utils/loadUnlockedZones", () => ({
  loadUnlockedZones: vi.fn(() => ({
    gen1: [{ id: "pastoral-route", label: "Route bucolique" }],
    gen2: [{ id: "country-road", label: "Route champêtre" }],
    gen3: [],
  })),
}));

import { resolveRequestedZone } from "../../src/methods/zones/resolveRequestedZone";

const GUILD_ID = "test-guild";

describe("resolveRequestedZone", () => {
  afterEach(() => {
    delete process.env.METEORITE_EVENT_DEBUG;
  });

  it("résout une zone débloquée par son id", () => {
    expect(resolveRequestedZone(GUILD_ID, "pastoral-route")).toEqual({
      status: "ok",
      zone: { id: "pastoral-route", label: "Route bucolique" },
    });
  });

  it("résout une zone débloquée par son libellé, insensible à la casse", () => {
    const resolved = resolveRequestedZone(GUILD_ID, "  route CHAMPÊTRE ");
    expect(resolved.status).toBe("ok");
  });

  it("signale une zone connue mais non débloquée", () => {
    const resolved = resolveRequestedZone(GUILD_ID, "safari-zone");
    expect(resolved.status).toBe("locked");
  });

  it("signale une zone inconnue", () => {
    expect(resolveRequestedZone(GUILD_ID, "n'importe quoi").status).toBe("unknown");
    expect(resolveRequestedZone(GUILD_ID, "   ").status).toBe("unknown");
  });

  it("n'ouvre la zone d'événement que pendant l'événement", () => {
    expect(resolveRequestedZone(GUILD_ID, "meteorite-crater").status).toBe("locked");

    process.env.METEORITE_EVENT_DEBUG = "1";
    expect(resolveRequestedZone(GUILD_ID, "meteorite-crater")).toEqual({
      status: "ok",
      zone: { id: "meteorite-crater", label: "Cratère de la Météorite" },
    });
  });
});
