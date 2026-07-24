import { describe, it, expect, vi, beforeEach } from "vitest";
import { pitySystem } from "../src/methods/pity/pitySystem";
import { resetPityCounterIfNeeded } from "../src/methods/pity/resetPityCounterIfNeeded";

vi.mock("../src/utils/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  getLoggerForGuild: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

const GUILD_ID = "test-guild";

describe("pitySystem", () => {
  beforeEach(() => {
    process.env.PITY_THRESHOLD = "5";
  });

  it("initializes counter to 0 and returns false", () => {
    const player = { name: "test" } as any;
    expect(pitySystem(GUILD_ID, player)).toBe(false);
    expect(player.pityCounter).toBe(0);
  });

  it("increments counter", () => {
    const player = { name: "test", pityCounter: 2 } as any;
    pitySystem(GUILD_ID, player);
    expect(player.pityCounter).toBe(3);
  });

  it("triggers pity when counter reaches threshold", () => {
    const player = { name: "test", pityCounter: 5 } as any;
    expect(pitySystem(GUILD_ID, player)).toBe(true);
    expect(player.pityCounter).toBe(0);
  });
});

describe("resetPityCounterIfNeeded", () => {
  it("resets for very_rare", () => {
    const player = { name: "test", pityCounter: 3 } as any;
    resetPityCounterIfNeeded(GUILD_ID, player, "very_rare");
    expect(player.pityCounter).toBe(0);
  });

  it("does not reset for common", () => {
    const player = { name: "test", pityCounter: 3 } as any;
    resetPityCounterIfNeeded(GUILD_ID, player, "common");
    expect(player.pityCounter).toBe(3);
  });
});
