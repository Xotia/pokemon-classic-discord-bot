import { Client } from "discord.js";
import cron from "node-cron";
import logger from "../../utils/logger";
import {
  HALLOWEEN_WORLD_BOSS_CLOSE,
  HALLOWEEN_WORLD_BOSS_ID,
  HALLOWEEN_WORLD_BOSS_OPEN,
} from "./halloweenEventConfig";
import {
  loadHalloweenWorldBossState,
  saveHalloweenWorldBossState,
} from "./halloweenWorldBossState.service";
import { closeWorldBossAndResolve, openWorldBoss } from "../worldBoss/worldBossScheduler";
import { loadWorldBossState } from "../worldBoss/worldBossState.service";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Un tick GLOBAL (pas par serveur) : le World Boss est unique, l'ouvrir depuis
 * le tick de chaque serveur l'ouvrirait N fois.
 *
 * Volontairement indépendant de `isHalloweenEventActive` et donc de
 * `HALLOWEEN_EVENT_DEBUG` : seules les dates explicites comptent, le mode debug
 * n'ouvre jamais le World Boss tout seul (l'admin garde `/world-boss-force-start`).
 *
 * Chaque étape n'est marquée faite qu'en cas de succès (retentée à la minute
 * suivante). Rattrapage : un bot arrêté à l'ouverture ouvre dès son retour, tant
 * que la clôture n'est pas passée ; passé la clôture, on n'ouvre plus rien.
 */
export async function runHalloweenWorldBossTick(client: Client, now = new Date()): Promise<void> {
  // Le scheduler démarre avant client.login() : on réessaiera à la minute suivante.
  if (!client.isReady()) {
    logger.info({ event: "halloween_world_boss_tick_skipped_client_not_ready" });
    return;
  }

  if (now < HALLOWEEN_WORLD_BOSS_OPEN) return;

  const state = await loadHalloweenWorldBossState();

  if (!state.openedDone && now < HALLOWEEN_WORLD_BOSS_CLOSE) {
    try {
      const opened = await openWorldBoss(client, {
        bossId: HALLOWEEN_WORLD_BOSS_ID,
        registrationClosesAt: HALLOWEEN_WORLD_BOSS_CLOSE,
      });

      if (opened) {
        state.openedDone = true;
        await saveHalloweenWorldBossState(state);
      } else {
        // null = un world boss est déjà ouvert (le boss est forcé par id, le
        // vivier n'entre pas en jeu). Si c'est déjà Darkrai (forcé par l'admin),
        // l'étape est faite. Sinon un autre boss occupe le créneau : on retente
        // à la minute suivante (l'admin peut le clôturer), borné par la clôture.
        const current = await loadWorldBossState();
        if (current.status === "registration" && current.boss?.id === HALLOWEEN_WORLD_BOSS_ID) {
          state.openedDone = true;
          await saveHalloweenWorldBossState(state);
        } else {
          logger.warn(
            { event: "halloween_world_boss_open_blocked", currentBossId: current.boss?.id ?? null },
            "[HALLOWEEN] World Boss non ouvert : un autre world boss est déjà ouvert, nouvel essai à la minute suivante",
          );
        }
      }
    } catch (error) {
      logger.error({ event: "halloween_world_boss_open_failed", error: errorMessage(error) });
    }
  }

  if (!state.closedDone && now >= HALLOWEEN_WORLD_BOSS_CLOSE) {
    try {
      const current = await loadWorldBossState();
      // Ne jamais clôturer un boss hebdomadaire par erreur.
      if (current.status === "registration" && current.boss?.id === HALLOWEEN_WORLD_BOSS_ID) {
        await closeWorldBossAndResolve(client);
      }
      state.closedDone = true;
      await saveHalloweenWorldBossState(state);
    } catch (error) {
      logger.error({ event: "halloween_world_boss_close_failed", error: errorMessage(error) });
    }
  }
}

export function startHalloweenWorldBossScheduler(client: Client): void {
  cron.schedule(
    "*/1 * * * *",
    () => {
      void runHalloweenWorldBossTick(client).catch((error) => {
        logger.error({ event: "halloween_world_boss_tick_failed", error: errorMessage(error) });
      });
    },
    { timezone: "Europe/Paris" },
  );
}
