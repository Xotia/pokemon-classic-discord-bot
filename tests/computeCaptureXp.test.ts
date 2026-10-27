import { describe, it, expect } from "vitest";
import { computeCaptureXp } from "../src/methods/xp/computeCaptureXp";
import { RARITY_XP_MULTIPLIER, getRarityXpMultiplier } from "../src/config/rarityXp";
import { RARITY_ORDER } from "../src/config/rarity";

describe("computeCaptureXp", () => {
  it("keeps base HP for a common capture", () => {
    expect(computeCaptureXp(45, "common", false, 1)).toBe(45);
  });

  it("applies the rarity multiplier", () => {
    expect(computeCaptureXp(100, "legendary", false, 1)).toBe(750);
    expect(computeCaptureXp(90, "legendary_wandering", false, 1)).toBe(810);
  });

  it("rounds fractional multipliers", () => {
    // Leveinard : 250 × 4.75 = 1187.5
    expect(computeCaptureXp(250, "mythic", false, 1)).toBe(1188);
  });

  it("stacks rarity, shiny and meteorite bonuses", () => {
    // 50 × 2.5 (epic) × 10 (shiny) × 2 (météorite)
    expect(computeCaptureXp(50, "epic", true, 2)).toBe(2500);
  });

  it("falls back to ×1 for an unknown rarity key", () => {
    expect(computeCaptureXp(60, "not_a_rarity", false, 1)).toBe(60);
  });

  it("returns 0 when HP is missing", () => {
    expect(computeCaptureXp(0, "mythic", true, 2)).toBe(0);
  });
});

describe("RARITY_XP_MULTIPLIER", () => {
  it("defines a multiplier for every rarity", () => {
    for (const rarity of RARITY_ORDER) {
      expect(getRarityXpMultiplier(rarity)).toBe(RARITY_XP_MULTIPLIER[rarity]);
    }
  });

  it("never decreases from common to legendary_wandering", () => {
    const ladder = RARITY_ORDER.filter((r) => r !== "unknown").map((r) => RARITY_XP_MULTIPLIER[r]);
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i]).toBeGreaterThanOrEqual(ladder[i - 1]);
    }
  });
});
