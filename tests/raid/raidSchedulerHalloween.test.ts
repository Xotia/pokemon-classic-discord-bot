import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadRaidState = vi.fn();
const saveRaidState = vi.fn();
const resetRaidState = vi.fn();
const generateRaidState = vi.fn();
const generateHalloweenRaidState = vi.fn();
const unlockRaidZone = vi.fn();
const applyRaidRewards = vi.fn();

vi.mock("../../src/features/raid/raidState.service", () => ({
  loadRaidState: (...a: unknown[]) => loadRaidState(...a),
  saveRaidState: (...a: unknown[]) => saveRaidState(...a),
  resetRaidState: (...a: unknown[]) => resetRaidState(...a),
}));
vi.mock("../../src/features/raid/raidGenerator.service", () => ({
  generateRaidState: (...a: unknown[]) => generateRaidState(...a),
}));
vi.mock("../../src/features/halloweenEvent/generateHalloweenRaidState", () => ({
  generateHalloweenRaidState: (...a: unknown[]) => generateHalloweenRaidState(...a),
}));
vi.mock("../../src/features/raid/buildRaidAnnouncementEmbed", () => ({
  buildRaidAnnouncementEmbed: async () => ({ announcement: true }),
}));
vi.mock("../../src/features/raid/buildRaidResultEmbed", () => ({ buildRaidResultEmbed: () => ({}) }));
vi.mock("../../src/features/raid/resolveRaid", () => ({
  resolveRaid: (state: any) => ({ ...state, result: { success: true, participantsCount: 1 } }),
}));
vi.mock("../../src/features/raid/applyRaidRewards", () => ({
  applyRaidRewards: (...a: unknown[]) => applyRaidRewards(...a),
}));
vi.mock("../../src/features/raid/unlockRaidZone", () => ({
  unlockRaidZone: (...a: unknown[]) => unlockRaidZone(...a),
}));
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

import {
  closeRaidFromScheduler,
  openRaidFromScheduler,
  setDiscordClient,
} from "../../src/features/raid/raidScheduler";

const send = vi.fn();
const darkraiState = { raidId: "r-dark", status: "registration", zone: "Manoir hanté", generation: null, raidPokemon: { id: 491, name: "Darkrai" } };
const randomState = { raidId: "r-rand", status: "registration", zone: "Forêt", generation: 1, raidPokemon: { id: 1, name: "Bulbizarre" } };

beforeEach(() => {
  delete process.env.HALLOWEEN_EVENT_DEBUG;
  delete process.env.METEORITE_EVENT_DEBUG;
  vi.useFakeTimers();
  for (const m of [loadRaidState, saveRaidState, resetRaidState, generateRaidState, generateHalloweenRaidState, unlockRaidZone, applyRaidRewards, send]) m.mockReset();
  loadRaidState.mockResolvedValue({ status: "idle", defenders: [] });
  generateRaidState.mockResolvedValue(randomState);
  generateHalloweenRaidState.mockResolvedValue(darkraiState);
  send.mockResolvedValue(undefined);
  setDiscordClient({ channels: { fetch: async () => ({ isSendable: () => true, send }) } } as any);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ouverture du raid par le cron générique", () => {
  it("le 31 octobre : sauvegarde et annonce le raid Darkrai, sans tirage aléatoire", async () => {
    vi.setSystemTime(new Date("2026-10-31T17:00:00Z"));

    await openRaidFromScheduler("g", "chan");

    expect(generateHalloweenRaidState).toHaveBeenCalledWith("g");
    expect(generateRaidState).not.toHaveBeenCalled();
    expect(saveRaidState).toHaveBeenCalledWith("g", darkraiState);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("mode debug HALLOWEEN_EVENT_DEBUG=1 : raid Darkrai également", async () => {
    vi.setSystemTime(new Date("2026-05-01T10:00:00Z"));
    process.env.HALLOWEEN_EVENT_DEBUG = "1";

    await openRaidFromScheduler("g", "chan");

    expect(saveRaidState).toHaveBeenCalledWith("g", darkraiState);
  });

  it("hors évènement : tirage aléatoire habituel", async () => {
    vi.setSystemTime(new Date("2026-10-29T17:00:00Z"));

    await openRaidFromScheduler("g", "chan");

    expect(generateHalloweenRaidState).not.toHaveBeenCalled();
    expect(saveRaidState).toHaveBeenCalledWith("g", randomState);
  });

  it("pendant la Météorite : retour anticipé, rien n'est ouvert (priorité sur Halloween)", async () => {
    vi.setSystemTime(new Date("2026-05-01T10:00:00Z"));
    process.env.METEORITE_EVENT_DEBUG = "1";
    process.env.HALLOWEEN_EVENT_DEBUG = "1";

    await openRaidFromScheduler("g", "chan");

    expect(generateRaidState).not.toHaveBeenCalled();
    expect(generateHalloweenRaidState).not.toHaveBeenCalled();
    expect(saveRaidState).not.toHaveBeenCalled();
  });
});

describe("résolution d'un raid d'évènement sans génération", () => {
  it("victoire avec generation null : aucun déblocage de zone", async () => {
    vi.setSystemTime(new Date("2026-10-31T20:00:00Z"));
    loadRaidState.mockResolvedValue({ ...darkraiState, defenders: [{ userId: "u1", pokemonName: "X" }] });
    applyRaidRewards.mockResolvedValue({ xp: 10, raidWin: true });

    await closeRaidFromScheduler("g", "chan");

    expect(applyRaidRewards).toHaveBeenCalled();
    expect(unlockRaidZone).not.toHaveBeenCalled();
    expect(resetRaidState).toHaveBeenCalledWith("g");
  });
});
