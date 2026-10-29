import { beforeEach, describe, expect, it, vi } from "vitest";

let schedState: any;
let wbState: any;

vi.mock("../src/features/halloweenEvent/halloweenWorldBossState.service", () => ({
  loadHalloweenWorldBossState: async () => structuredClone(schedState),
  saveHalloweenWorldBossState: async (state: any) => {
    schedState = structuredClone(state);
  },
}));

const openWorldBoss = vi.fn();
const closeWorldBossAndResolve = vi.fn();
vi.mock("../src/features/worldBoss/worldBossScheduler", () => ({
  openWorldBoss: (...args: unknown[]) => openWorldBoss(...args),
  closeWorldBossAndResolve: (...args: unknown[]) => closeWorldBossAndResolve(...args),
}));

vi.mock("../src/features/worldBoss/worldBossState.service", () => ({
  loadWorldBossState: async () => wbState,
}));

vi.mock("node-cron", () => ({ default: { schedule: vi.fn() } }));

vi.mock("../src/utils/logger", () => {
  const noop = () => {};
  return { default: { info: noop, warn: noop, error: noop } };
});

import { runHalloweenWorldBossTick } from "../src/features/halloweenEvent/halloweenWorldBossScheduler";

const READY = { isReady: () => true } as any;
const NOT_READY = { isReady: () => false } as any;

const BEFORE_OPEN = new Date("2026-10-31T16:59:00Z");
const OPEN = new Date("2026-10-31T17:00:00Z");
const DURING = new Date("2026-10-31T20:00:00Z");
const CLOSE = new Date("2026-10-31T22:00:00Z");

const DARKRAI_OPEN = { status: "registration", boss: { id: "wb-halloween-2026-darkrai" } };
const WEEKLY_OPEN = { status: "registration", boss: { id: "wb-001-venusaur-gmax" } };
const IDLE = { status: "idle", boss: null };

beforeEach(() => {
  delete process.env.HALLOWEEN_EVENT_DEBUG;
  schedState = { openedDone: false, closedDone: false };
  wbState = IDLE;
  openWorldBoss.mockReset().mockResolvedValue({ status: "registration" });
  closeWorldBossAndResolve.mockReset().mockResolvedValue({});
});

describe("tick global du World Boss d'Halloween", () => {
  it("n'ouvre rien avant la date d'ouverture", async () => {
    await runHalloweenWorldBossTick(READY, BEFORE_OPEN);

    expect(openWorldBoss).not.toHaveBeenCalled();
  });

  it("ouvre Darkrai à la date d'ouverture, une seule fois, avec la clôture de l'évènement", async () => {
    await runHalloweenWorldBossTick(READY, OPEN);
    await runHalloweenWorldBossTick(READY, DURING);

    expect(openWorldBoss).toHaveBeenCalledTimes(1);
    expect(openWorldBoss).toHaveBeenCalledWith(READY, {
      bossId: "wb-halloween-2026-darkrai",
      registrationClosesAt: CLOSE,
    });
    expect(schedState.openedDone).toBe(true);
  });

  it("rattrape l'ouverture si le bot revient pendant la fenêtre", async () => {
    await runHalloweenWorldBossTick(READY, DURING);

    expect(openWorldBoss).toHaveBeenCalledTimes(1);
  });

  it("n'ouvre pas après la clôture (bot arrêté trop longtemps)", async () => {
    await runHalloweenWorldBossTick(READY, new Date("2026-10-31T22:30:00Z"));

    expect(openWorldBoss).not.toHaveBeenCalled();
    expect(closeWorldBossAndResolve).not.toHaveBeenCalled();
  });

  it("ignore le mode debug : seules les dates comptent", async () => {
    process.env.HALLOWEEN_EVENT_DEBUG = "1";

    await runHalloweenWorldBossTick(READY, BEFORE_OPEN);

    expect(openWorldBoss).not.toHaveBeenCalled();
  });

  it("ne fait rien tant que le client n'est pas prêt, puis retente", async () => {
    await runHalloweenWorldBossTick(NOT_READY, DURING);
    expect(openWorldBoss).not.toHaveBeenCalled();

    await runHalloweenWorldBossTick(READY, DURING);
    expect(openWorldBoss).toHaveBeenCalledTimes(1);
  });

  it("n'est pas marqué fait si l'ouverture échoue, et retente", async () => {
    openWorldBoss.mockRejectedValueOnce(new Error("boom"));

    await runHalloweenWorldBossTick(READY, DURING);
    expect(schedState.openedDone).toBe(false);

    await runHalloweenWorldBossTick(READY, DURING);
    expect(schedState.openedDone).toBe(true);
    expect(openWorldBoss).toHaveBeenCalledTimes(2);
  });

  it("déjà ouvert sur Darkrai (forcé par l'admin) : marqué fait", async () => {
    openWorldBoss.mockResolvedValue(null);
    wbState = DARKRAI_OPEN;

    await runHalloweenWorldBossTick(READY, DURING);

    expect(schedState.openedDone).toBe(true);
  });

  it("autre boss déjà ouvert : non marqué fait, retenté à la minute suivante", async () => {
    openWorldBoss.mockResolvedValue(null);
    wbState = WEEKLY_OPEN;

    await runHalloweenWorldBossTick(READY, DURING);
    await runHalloweenWorldBossTick(READY, DURING);

    expect(schedState.openedDone).toBe(false);
    expect(openWorldBoss).toHaveBeenCalledTimes(2);
  });

  it("clôture Darkrai en inscription à l'heure de clôture, une seule fois", async () => {
    schedState = { openedDone: true, closedDone: false };
    wbState = DARKRAI_OPEN;

    await runHalloweenWorldBossTick(READY, CLOSE);
    await runHalloweenWorldBossTick(READY, CLOSE);

    expect(closeWorldBossAndResolve).toHaveBeenCalledTimes(1);
    expect(schedState.closedDone).toBe(true);
  });

  it("ne clôture pas avant l'heure de clôture", async () => {
    schedState = { openedDone: true, closedDone: false };
    wbState = DARKRAI_OPEN;

    await runHalloweenWorldBossTick(READY, DURING);

    expect(closeWorldBossAndResolve).not.toHaveBeenCalled();
  });

  it("ne clôture jamais un boss hebdomadaire", async () => {
    schedState = { openedDone: true, closedDone: false };
    wbState = WEEKLY_OPEN;

    await runHalloweenWorldBossTick(READY, CLOSE);

    expect(closeWorldBossAndResolve).not.toHaveBeenCalled();
    expect(schedState.closedDone).toBe(true);
  });

  it("ne clôture pas si rien n'est ouvert", async () => {
    schedState = { openedDone: true, closedDone: false };

    await runHalloweenWorldBossTick(READY, CLOSE);

    expect(closeWorldBossAndResolve).not.toHaveBeenCalled();
  });

  it("clôture non marquée faite si elle échoue, puis retentée", async () => {
    schedState = { openedDone: true, closedDone: false };
    wbState = DARKRAI_OPEN;
    closeWorldBossAndResolve.mockRejectedValueOnce(new Error("boom"));

    await runHalloweenWorldBossTick(READY, CLOSE);
    expect(schedState.closedDone).toBe(false);

    await runHalloweenWorldBossTick(READY, CLOSE);
    expect(schedState.closedDone).toBe(true);
    expect(closeWorldBossAndResolve).toHaveBeenCalledTimes(2);
  });
});
