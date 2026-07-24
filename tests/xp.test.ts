import { describe, it, expect } from "vitest";
import { addXp, getLevelFromXp, xpTotalForLevel, xpToNextLevel } from "../src/methods/xp/xp";

describe("XP system", () => {
  it("level 1 requires 0 total XP", () => {
    expect(xpTotalForLevel(1)).toBe(0);
  });

  it("level 100 is max", () => {
    expect(xpToNextLevel(100)).toBe(0);
  });

  it("getLevelFromXp returns 1 for 0 XP", () => {
    expect(getLevelFromXp(0)).toBe(1);
  });

  it("addXp returns correct level and XP", () => {
    const result = addXp(0, 100);
    expect(result.xp).toBe(100);
    expect(result.level).toBeGreaterThanOrEqual(1);
  });

  it("addXp detects level up", () => {
    const xpForLevel5 = xpTotalForLevel(5);
    const result = addXp(0, xpForLevel5 + 1);
    expect(result.level).toBeGreaterThanOrEqual(5);
  });
});
