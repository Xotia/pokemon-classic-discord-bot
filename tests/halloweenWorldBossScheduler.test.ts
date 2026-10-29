import { beforeEach, describe, expect, it, vi } from "vitest";

let schedState: any;
let wbState: any;
let defeatedIds: string[] = [];

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

vi.mock("../src/features/worldBoss/worldBossHistory.service", () => ({
  getDefeatedBossIds: async () => defeatedIds,
}));

vi.mock("node-cron", () => ({ default: { schedule: vi.fn() } }));

const warn = vi.fn();
vi.mock("../src/utils/logger", () => {
  return { default: { info: vi.fn(), warn: (...a: unknown[]) => warn(...a), error: vi.fn() } };
});

import { runHalloweenWorldBossTick } from "../src/features/halloweenEvent/halloweenWorldBossScheduler";

const READY = { isReady: () => true } as any;
const NOT_READY = { isReady: () => false } as any;

const BEFORE_OPEN = new Date("2026-10-31T16:59:00Z");
const OPEN = new Date("2026-10-31T17:00:00Z");
const DURING = new Date("2026-10-31T20:00:00Z");
const CLOSE = new Date("2026-10-31T22:00:00Z");

const EVENT_OPEN = { status: "registration", boss: { id: "wb-008-gengar-gmax" } };
const WEEKLY_OPEN = { status: "registration", boss: { id: "wb-001-venusaur-gmax" } };
const IDLE = { status: "idle", boss: null };

beforeEach(() => {
  delete process.env.HALLOWEEN_EVENT_DEBUG;
  schedState = { openedDone: false, closedDone: false };
  wbState = IDLE;
  defeatedIds = [];
  warn.mockReset();
  openWorldBoss.mockReset().mockResolvedValue({ status: "registration" });
  closeWorldBossAndResolve.mockReset().mockResolvedValue({});
});

describe("tick global du World Boss d'Halloween", () => {
  it("n'ouvre rien avant la date d'ouverture", async () => {
    await runHalloweenWorldBossTick(READY, BEFORE_OPEN);

    expect(openWorldBoss).not.toHaveBeenCalled();
  });

  it("ouvre Ectoplasma Gigamax à la date d'ouverture, une seule fois, avec la clôture de l'évènement", async () => {
    await runHalloweenWorldBossTick(READY, OPEN);
    await runHalloweenWorldBossTick(READY, DURING);

    expect(openWorldBoss).toHaveBeenCalledTimes(1);
    expect(openWorldBoss).toHaveBeenCalledWith(READY, {
      bossId: "wb-008-gengar-gmax",
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

  it("déjà ouvert sur le boss de l'évènement (forcé par l'admin) : marqué fait", async () => {
    openWorldBoss.mockResolvedValue(null);
    wbState = EVENT_OPEN;

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

  it("boss déjà vaincu : journalisé, marqué fait avec la raison, pas de nouvelle tentative", async () => {
    defeatedIds = ["wb-008-gengar-gmax"];

    await runHalloweenWorldBossTick(READY, DURING);
    await runHalloweenWorldBossTick(READY, DURING);

    expect(openWorldBoss).not.toHaveBeenCalled();
    expect(schedState.openedDone).toBe(true);
    expect(schedState.openSkippedReason).toBe("boss_already_defeated");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatchObject({ event: "halloween_world_boss_open_skipped_defeated" });
  });

  it("clôture le boss d'Halloween en inscription à l'heure de clôture, une seule fois", async () => {
    schedState = { openedDone: true, closedDone: false };
    wbState = EVENT_OPEN;

    await runHalloweenWorldBossTick(READY, CLOSE);
    await runHalloweenWorldBossTick(READY, CLOSE);

    expect(closeWorldBossAndResolve).toHaveBeenCalledTimes(1);
    expect(schedState.closedDone).toBe(true);
  });

  it("ne clôture pas avant l'heure de clôture", async () => {
    schedState = { openedDone: true, closedDone: false };
    wbState = EVENT_OPEN;

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
    wbState = EVENT_OPEN;
    closeWorldBossAndResolve.mockRejectedValueOnce(new Error("boom"));

    await runHalloweenWorldBossTick(READY, CLOSE);
    expect(schedState.closedDone).toBe(false);

    await runHalloweenWorldBossTick(READY, CLOSE);
    expect(schedState.closedDone).toBe(true);
    expect(closeWorldBossAndResolve).toHaveBeenCalledTimes(2);
  });
});
