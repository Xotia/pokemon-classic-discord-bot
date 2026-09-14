import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadRaidState = vi.fn();
const saveRaidState = vi.fn();
const resetRaidState = vi.fn();

vi.mock("../../src/features/raid/raidState.service", () => ({
  loadRaidState: (...args: unknown[]) => loadRaidState(...args),
  saveRaidState: (...args: unknown[]) => saveRaidState(...args),
  resetRaidState: (...args: unknown[]) => resetRaidState(...args),
}));
vi.mock("../../src/features/raid/raidGenerator.service", () => ({ generateRaidState: vi.fn() }));
vi.mock("../../src/features/raid/buildRaidAnnouncementEmbed", () => ({ buildRaidAnnouncementEmbed: vi.fn() }));
vi.mock("../../src/features/raid/buildRaidResultEmbed", () => ({ buildRaidResultEmbed: vi.fn() }));
vi.mock("../../src/features/raid/resolveRaid", () => ({
  resolveRaid: (state: any) => ({ ...state, result: { success: false, participantsCount: state.defenders.length } }),
}));
vi.mock("../../src/features/raid/applyRaidRewards", () => ({
  applyRaidRewards: async () => ({ xp: 0, raidWin: false }),
}));
vi.mock("../../src/features/raid/unlockRaidZone", () => ({ unlockRaidZone: vi.fn() }));
vi.mock("../../src/config/guilds", () => ({ loadGuildRegistry: () => [] }));
vi.mock("../../src/config/guildSettings", () => ({
  getRaidSchedulerMode: vi.fn(),
  getRaidStartHour: vi.fn(),
  getRaidEndHour: vi.fn(),
}));
vi.mock("../../src/utils/logger", () => {
  const noop = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
  return { default: noop, getLoggerForGuild: () => noop };
});

import { closeRaidFromScheduler } from "../../src/features/raid/raidScheduler";
import { isActiveMeteoriteZone } from "../../src/features/meteoriteEvent/meteoriteEventConfig";

const GUILD_ID = "guild";

function raidInZone(zone: string) {
  return {
    raidId: "raid-1",
    status: "registration",
    zone,
    generation: 3,
    defenders: [{ userId: "u1", pokemonName: "Groudon" }],
    result: null,
    reward: null,
  };
}

describe("clôture générique d'un raid dans le Cratère de la météorite", () => {
  beforeEach(() => {
    delete process.env.METEORITE_EVENT_DEBUG;
    vi.useFakeTimers();
    loadRaidState.mockReset();
    saveRaidState.mockReset();
    resetRaidState.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clôture un raid resté dans la zone hors évènement", async () => {
    // Cas de prod du 13/09 : raid jamais clôturé à 22h.
    vi.setSystemTime(new Date("2026-09-13T20:00:00Z"));
    loadRaidState.mockResolvedValue(raidInZone("Cratère de la météorite"));

    await closeRaidFromScheduler(GUILD_ID, "channel");

    expect(saveRaidState).toHaveBeenCalledWith(
      GUILD_ID,
      expect.objectContaining({ status: "reward_pending" }),
    );
    expect(resetRaidState).toHaveBeenCalledWith(GUILD_ID);
  });

  it("laisse la clôture au scheduler météorite pendant l'évènement", async () => {
    vi.setSystemTime(new Date("2026-08-11T20:00:00Z"));
    loadRaidState.mockResolvedValue(raidInZone("Cratère de la Météorite"));

    await closeRaidFromScheduler(GUILD_ID, "channel");

    expect(saveRaidState).not.toHaveBeenCalled();
    expect(resetRaidState).not.toHaveBeenCalled();
  });
});

describe("isActiveMeteoriteZone", () => {
  it("ne reconnaît la zone d'évènement que pendant l'évènement", () => {
    const during = new Date("2026-08-11T12:00:00Z");
    const after = new Date("2026-09-13T20:00:00Z");

    expect(isActiveMeteoriteZone("meteorite-crater", during)).toBe(true);
    expect(isActiveMeteoriteZone("Cratère de la météorite", during)).toBe(true);
    expect(isActiveMeteoriteZone("meteorite-crater", after)).toBe(false);
    expect(isActiveMeteoriteZone("Cratère de la météorite", after)).toBe(false);
    expect(isActiveMeteoriteZone("verdant-plain", during)).toBe(false);
  });
});
