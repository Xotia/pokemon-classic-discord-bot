import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Les crons sont capturés au lieu d'être planifiés : chaque test déclenche
// manuellement un « tick » et observe ce qui a été persisté.
const scheduledTicks: Array<() => Promise<void>> = [];

vi.mock("node-cron", () => ({
  default: {
    schedule: (_expression: string, callback: () => Promise<void>) => {
      scheduledTicks.push(callback);
      return { stop: vi.fn() };
    },
  },
}));

const GUILD = {
  guildId: "test-guild",
  name: "Test",
  mainChannelId: "main-channel",
  devChannelId: "dev-channel",
  loreChannelId: "lore-channel",
  raidAnnounceChannelId: "raid-channel",
};

vi.mock("../src/config/guilds", () => ({
  loadGuildRegistry: () => [GUILD],
}));

const savedStates: any[] = [];
let currentState: any;

vi.mock("../src/features/meteoriteEvent/meteoriteEventState.service", () => ({
  loadMeteoriteEventState: async () => structuredClone(currentState),
  saveMeteoriteEventState: async (_guildId: string, state: any) => {
    currentState = structuredClone(state);
    savedStates.push(structuredClone(state));
  },
}));

const sendRaidAnnouncement = vi.fn();
const openRaidRegistration = vi.fn();
const closeRaidAndResolve = vi.fn();

vi.mock("../src/features/raid/raidScheduler", () => ({
  sendRaidAnnouncement: (...args: unknown[]) => sendRaidAnnouncement(...args),
  openRaidRegistration: (...args: unknown[]) => openRaidRegistration(...args),
  closeRaidAndResolve: (...args: unknown[]) => closeRaidAndResolve(...args),
}));

vi.mock("../src/features/meteoriteEvent/buildMeteoriteLoreEmbeds", () => ({
  buildMeteoriteWarningEmbed: () => ({ kind: "warning" }),
  buildMeteoriteStartEmbed: () => ({ kind: "start" }),
  buildMeteoriteEndEmbed: () => ({ kind: "end" }),
}));

vi.mock("../src/features/meteoriteEvent/generateMeteoriteRaidState", () => ({
  generateMeteoriteRaidState: async () => ({}),
}));

const loggedEvents: string[] = [];

vi.mock("../src/utils/logger", () => {
  const record = (payload: any) => {
    if (payload && typeof payload === "object" && payload.event) loggedEvents.push(payload.event);
  };
  return {
    default: { info: record, error: record },
    getLoggerForGuild: () => ({ info: record, error: record }),
  };
});

import { startMeteoriteEventScheduler } from "../src/features/meteoriteEvent/meteoriteEventScheduler";

const EVENT_DAY = "2026-08-11";
const READY_CLIENT = { isReady: () => true } as any;

function freshState() {
  return {
    warningAnnounced: true,
    zoneOpenedAnnounced: false,
    zoneClosedAnnounced: false,
    checkpointsFired: {} as Record<number, { opened: boolean; closed: boolean }>,
  };
}

/** Déclenche le cron principal (le premier planifié) à l'instant donné. */
async function tickAt(iso: string) {
  vi.setSystemTime(new Date(iso));
  await scheduledTicks[0]();
}

beforeEach(() => {
  scheduledTicks.length = 0;
  savedStates.length = 0;
  loggedEvents.length = 0;
  sendRaidAnnouncement.mockReset().mockResolvedValue(undefined);
  openRaidRegistration.mockReset().mockResolvedValue(undefined);
  closeRaidAndResolve.mockReset().mockResolvedValue(undefined);
  currentState = freshState();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("annonce d'ouverture de la zone", () => {
  it("marque l'annonce faite quand l'envoi réussit", async () => {
    startMeteoriteEventScheduler(READY_CLIENT);

    await tickAt(`${EVENT_DAY}T06:01:00Z`);

    expect(sendRaidAnnouncement).toHaveBeenCalledTimes(1);
    expect(currentState.zoneOpenedAnnounced).toBe(true);
  });

  it("ne marque rien et réessaie au tick suivant quand l'envoi échoue", async () => {
    startMeteoriteEventScheduler(READY_CLIENT);
    sendRaidAnnouncement.mockRejectedValueOnce(new Error("channel indisponible"));

    await tickAt(`${EVENT_DAY}T06:01:00Z`);

    expect(currentState.zoneOpenedAnnounced).toBe(false);
    expect(loggedEvents).toContain("meteorite_start_embed_failed");

    await tickAt(`${EVENT_DAY}T06:02:00Z`);

    expect(sendRaidAnnouncement).toHaveBeenCalledTimes(2);
    expect(currentState.zoneOpenedAnnounced).toBe(true);
  });

  it("ne tente rien tant que le client Discord n'est pas connecté", async () => {
    const connectingClient = { isReady: () => false } as any;
    startMeteoriteEventScheduler(connectingClient);

    await tickAt(`${EVENT_DAY}T06:01:00Z`);

    expect(sendRaidAnnouncement).not.toHaveBeenCalled();
    expect(currentState.zoneOpenedAnnounced).toBe(false);
    expect(loggedEvents).toContain("meteorite_tick_skipped_client_not_ready");
  });
});

describe("créneaux de raid", () => {
  it("marque le créneau ouvert quand l'ouverture réussit", async () => {
    startMeteoriteEventScheduler(READY_CLIENT);

    await tickAt(`${EVENT_DAY}T08:00:00Z`);

    expect(openRaidRegistration).toHaveBeenCalledTimes(1);
    expect(currentState.checkpointsFired[0]).toEqual({ opened: true, closed: false });
  });

  it("réessaie l'ouverture au tick suivant après un échec", async () => {
    startMeteoriteEventScheduler(READY_CLIENT);
    openRaidRegistration.mockRejectedValueOnce(new Error("Discord indisponible"));

    await tickAt(`${EVENT_DAY}T08:00:00Z`);

    expect(currentState.checkpointsFired[0]?.opened ?? false).toBe(false);
    expect(loggedEvents).toContain("meteorite_raid_open_failed");

    await tickAt(`${EVENT_DAY}T08:01:00Z`);

    expect(openRaidRegistration).toHaveBeenCalledTimes(2);
    expect(currentState.checkpointsFired[0]).toEqual({ opened: true, closed: false });
  });

  it("abandonne un créneau dont la fenêtre est passée au lieu de l'ouvrir en retard", async () => {
    startMeteoriteEventScheduler(READY_CLIENT);

    // Bot redémarré à 12h30 : la fenêtre du premier raid (10h–12h Paris) est close.
    await tickAt(`${EVENT_DAY}T10:30:00Z`);

    expect(openRaidRegistration).not.toHaveBeenCalled();
    expect(currentState.checkpointsFired[0]).toEqual({ opened: true, closed: true });
    expect(loggedEvents).toContain("meteorite_raid_slot_missed");
  });

  it("ne marque pas le créneau clos si la résolution échoue", async () => {
    startMeteoriteEventScheduler(READY_CLIENT);
    currentState.checkpointsFired[0] = { opened: true, closed: false };
    closeRaidAndResolve.mockRejectedValueOnce(new Error("résolution KO"));

    await tickAt(`${EVENT_DAY}T10:00:00Z`);

    expect(currentState.checkpointsFired[0]).toEqual({ opened: true, closed: false });
    expect(loggedEvents).toContain("meteorite_raid_close_failed");

    await tickAt(`${EVENT_DAY}T10:01:00Z`);

    expect(closeRaidAndResolve).toHaveBeenCalledTimes(2);
    expect(currentState.checkpointsFired[0]).toEqual({ opened: true, closed: true });
  });
});
