import { beforeEach, describe, expect, it, vi } from "vitest";

const GUILD = { guildId: "test-guild", mainChannelId: "main-channel" };

let currentState: any;

vi.mock("../src/features/halloweenEvent/halloweenEventState.service", () => ({
  loadHalloweenEventState: async () => structuredClone(currentState),
  saveHalloweenEventState: async (_guildId: string, state: any) => {
    currentState = structuredClone(state);
  },
}));

const sendRaidAnnouncement = vi.fn();
vi.mock("../src/features/raid/raidScheduler", () => ({
  sendRaidAnnouncement: (...args: unknown[]) => sendRaidAnnouncement(...args),
}));

vi.mock("../src/features/halloweenEvent/buildHalloweenLoreEmbeds", () => ({
  buildHalloweenWarningEmbed: () => ({ kind: "warning" }),
  buildHalloweenStartEmbed: () => ({ kind: "start" }),
  buildHalloweenEndEmbed: () => ({ kind: "end" }),
}));

vi.mock("../src/utils/logger", () => {
  const noop = () => {};
  return {
    default: { info: noop, error: noop },
    getLoggerForGuild: () => ({ info: noop, error: noop }),
  };
});

import { runHalloweenEventTick } from "../src/features/halloweenEvent/halloweenEventScheduler";

const READY = { isReady: () => true } as any;
const NOT_READY = { isReady: () => false } as any;

const BEFORE_WARNING = new Date("2026-10-30T16:59:00Z");
const WARNING = new Date("2026-10-30T17:00:00Z");
const BEFORE_EVENT = new Date("2026-10-30T22:59:00Z");
const OPENING = new Date("2026-10-30T23:00:00Z");
const DURING = new Date("2026-10-31T12:00:00Z");
const AFTER_END = new Date("2026-10-31T23:00:00Z");

function kinds(): string[] {
  return sendRaidAnnouncement.mock.calls.map((call) => (call[2] as any).kind);
}

beforeEach(() => {
  delete process.env.HALLOWEEN_EVENT_DEBUG;
  sendRaidAnnouncement.mockReset().mockResolvedValue(undefined);
  currentState = { warningAnnounced: false, zoneOpenedAnnounced: false, endAnnounced: false };
});

describe("scheduler Halloween", () => {
  it("n'annonce rien avant la date d'avance", async () => {
    await runHalloweenEventTick(READY, GUILD, BEFORE_WARNING);
    expect(sendRaidAnnouncement).not.toHaveBeenCalled();
  });

  it("annonce l'avance une seule fois à partir de la date", async () => {
    await runHalloweenEventTick(READY, GUILD, WARNING);
    await runHalloweenEventTick(READY, GUILD, BEFORE_EVENT);
    expect(kinds()).toEqual(["warning"]);
    expect(currentState.warningAnnounced).toBe(true);
  });

  it("annonce l'ouverture une seule fois pendant la fenêtre", async () => {
    currentState.warningAnnounced = true;
    await runHalloweenEventTick(READY, GUILD, OPENING);
    await runHalloweenEventTick(READY, GUILD, DURING);
    expect(kinds()).toEqual(["start"]);
    expect(currentState.zoneOpenedAnnounced).toBe(true);
  });

  it("annonce la fin une seule fois après EVENT_END", async () => {
    currentState = { warningAnnounced: true, zoneOpenedAnnounced: true, endAnnounced: false };
    await runHalloweenEventTick(READY, GUILD, DURING);
    expect(sendRaidAnnouncement).not.toHaveBeenCalled();
    await runHalloweenEventTick(READY, GUILD, AFTER_END);
    await runHalloweenEventTick(READY, GUILD, new Date("2026-11-01T10:00:00Z"));
    expect(kinds()).toEqual(["end"]);
    expect(currentState.endAnnounced).toBe(true);
  });

  it("n'annonce pas la fin si l'ouverture n'a jamais été annoncée", async () => {
    currentState.warningAnnounced = true;
    await runHalloweenEventTick(READY, GUILD, AFTER_END);
    expect(sendRaidAnnouncement).not.toHaveBeenCalled();
  });

  it("ne marque rien et réessaie au tick suivant quand l'envoi échoue", async () => {
    sendRaidAnnouncement.mockRejectedValueOnce(new Error("channel indisponible"));
    await runHalloweenEventTick(READY, GUILD, WARNING);
    expect(currentState.warningAnnounced).toBe(false);

    await runHalloweenEventTick(READY, GUILD, new Date(WARNING.getTime() + 60_000));
    expect(currentState.warningAnnounced).toBe(true);
    expect(sendRaidAnnouncement).toHaveBeenCalledTimes(2);
  });

  it("ne fait rien tant que le client n'est pas prêt", async () => {
    await runHalloweenEventTick(NOT_READY, GUILD, DURING);
    expect(sendRaidAnnouncement).not.toHaveBeenCalled();
    expect(currentState.zoneOpenedAnnounced).toBe(false);
  });

  it("rattrape l'ouverture si le bot démarre en cours d'évènement", async () => {
    await runHalloweenEventTick(READY, GUILD, DURING);
    expect(kinds()).toEqual(["start"]);
  });
});
