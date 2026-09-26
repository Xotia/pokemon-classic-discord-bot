import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/utils/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  getLoggerForGuild: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

vi.mock("../src/methods/rarity/rollRarity", () => ({
  rollRarity: vi.fn(() => "common"),
}));

vi.mock("../src/methods/rarity/getPokemonByRarity", () => ({
  getPokemonByRarity: vi.fn(async (_g: string, _gen: string, _z: string, rarity: string) => ({
    pokemonCatched: { id: 1, name: "Bulbasaur", rarity },
    rarity,
  })),
}));

import { getDayKey, isDailyBoostAvailable } from "../src/methods/dailyBoost/dailyBoost";
import { getNewGatchaPokemon } from "../src/methods/gatcha/getNewGatchaPokemon";
import { rollRarity } from "../src/methods/rarity/rollRarity";

const GUILD_ID = "test-guild";

describe("getDayKey", () => {
  it("uses the Paris calendar day", () => {
    // 22h30 UTC le 26/09 = 00h30 le 27/09 à Paris (UTC+2)
    expect(getDayKey(new Date("2026-09-26T22:30:00Z"))).toBe("2026-09-27");
    expect(getDayKey(new Date("2026-09-26T21:30:00Z"))).toBe("2026-09-26");
  });

  it("handles winter time (UTC+1)", () => {
    expect(getDayKey(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
    expect(getDayKey(new Date("2026-12-31T22:30:00Z"))).toBe("2026-12-31");
  });
});

describe("isDailyBoostAvailable", () => {
  const now = new Date("2026-09-26T10:00:00Z");

  it("is available for a player who never used it", () => {
    expect(isDailyBoostAvailable({ name: "test" }, now)).toBe(true);
  });

  it("is not available once used today", () => {
    expect(isDailyBoostAvailable({ lastDailyBoostDay: "2026-09-26" }, now)).toBe(false);
  });

  it("is available again the next day", () => {
    expect(isDailyBoostAvailable({ lastDailyBoostDay: "2026-09-25" }, now)).toBe(true);
  });
});

describe("getNewGatchaPokemon with daily boost", () => {
  beforeEach(() => {
    process.env.PITY_THRESHOLD = "5";
    vi.mocked(rollRarity).mockClear();
  });

  it("rolls with the boosted list on the first capture of the day without touching pity", async () => {
    const player = { name: "test", pityCounter: 3 } as any;
    const result = await getNewGatchaPokemon(GUILD_ID, player, "gen1", "verdant-plain");

    expect(rollRarity).toHaveBeenCalledWith(GUILD_ID, true);
    expect(player.pityCounter).toBe(3);
    expect(result.dailyBoostDay).toBe(getDayKey());
  });

  it("keeps a pending pity for the next capture", async () => {
    const player = { name: "test", pityCounter: 5 } as any;
    await getNewGatchaPokemon(GUILD_ID, player, "gen1", "verdant-plain");

    expect(player.pityCounter).toBe(5);
  });

  it("falls back to normal pity once the daily boost is used", async () => {
    const player = { name: "test", pityCounter: 3, lastDailyBoostDay: getDayKey() } as any;
    const result = await getNewGatchaPokemon(GUILD_ID, player, "gen1", "verdant-plain");

    expect(rollRarity).toHaveBeenCalledWith(GUILD_ID, false);
    expect(player.pityCounter).toBe(4);
    expect(result.dailyBoostDay).toBeUndefined();
  });
});
