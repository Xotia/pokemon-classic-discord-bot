import cron from 'node-cron';
import type { Client } from 'discord.js';
import logger from '../../utils/logger';
import {
  WORLD_BOSS_TIMEZONE,
  getWorldBossEndCron,
  getWorldBossSchedulerMode,
  getWorldBossStartCron,
} from '../../config/worldBossSettings';
import { applyWorldBossRewards } from './applyWorldBossRewards';
import { archiveWorldBossResult } from './archiveWorldBossResult';
import { broadcastWorldBossEmbed } from './broadcastWorldBossEmbed';
import { buildWorldBossAnnouncementEmbed } from './buildWorldBossAnnouncementEmbed';
import { buildWorldBossResultEmbed } from './buildWorldBossResultEmbed';
import { generateWorldBossState, WorldBossGenerationOptions } from './generateWorldBossState';
import { resolveWorldBoss } from './resolveWorldBoss';
import {
  loadWorldBossState,
  resetWorldBossState,
  saveWorldBossState,
} from './worldBossState.service';
import { WorldBossState } from '../../types/worldBoss/WorldBossState';

const DEBUG_OPEN_CRON = '*/5 * * * *';
const DEBUG_CLOSE_CRON = '*/7 * * * *';

let discordClient: Client | null = null;

/**
 * Renseigné par startWorldBossScheduler au démarrage. Un script standalone qui
 * appelle openWorldBoss/closeWorldBossAndResolve directement doit passer par
 * ici, sinon la diffusion est silencieusement ignorée.
 */
export function setWorldBossClient(client: Client): void {
  discordClient = client;
}

/**
 * Ouvre l'événement mondial : un seul état, une annonce diffusée en parallèle
 * dans tous les serveurs.
 *
 * Deux cas passants, pas des erreurs : un world boss déjà ouvert (le cron a
 * doublé, ou un admin a forcé) et un vivier épuisé (plus aucun boss à tirer).
 * Retourne l'état ouvert, ou `null` si rien n'a été ouvert.
 */
export async function openWorldBoss(
  client: Client | null = discordClient,
  options: WorldBossGenerationOptions = {},
): Promise<WorldBossState | null> {
  const currentState = await loadWorldBossState();

  if (currentState.status === 'registration') {
    logger.info(
      { event: 'world_boss_open_skipped', worldBossId: currentState.worldBossId },
      '[WORLD BOSS] Un world boss est déjà ouvert aux inscriptions',
    );
    return null;
  }

  const state = await generateWorldBossState(options);

  if (!state) {
    // Vivier épuisé : l'événement de la semaine est sauté, le cron suivant
    // retentera. selectWorldBoss a déjà journalisé world_boss_pool_exhausted.
    return null;
  }

  await saveWorldBossState(state);

  logger.info(
    {
      event: 'world_boss_opened',
      worldBossId: state.worldBossId,
      bossId: state.boss?.id,
      difficulty: state.boss?.difficulty,
      registrationClosesAt: state.registrationClosesAt,
    },
    '[WORLD BOSS] Portail ouvert, inscriptions en cours',
  );

  if (client) {
    await broadcastWorldBossEmbed(client, buildWorldBossAnnouncementEmbed(state));
  }

  return state;
}

/**
 * Clôture, résout, récompense, archive, diffuse, remet à `idle`.
 *
 * L'ordre est imposé : une erreur de diffusion ne doit ni annuler les
 * récompenses déjà appliquées, ni empêcher le reset — sans quoi l'état resterait
 * bloqué en `resolved` et le world boss suivant ne pourrait pas s'ouvrir.
 */
export async function closeWorldBossAndResolve(
  client: Client | null = discordClient,
): Promise<WorldBossState | null> {
  const currentState = await loadWorldBossState();

  if (currentState.status !== 'registration') {
    logger.info(
      { event: 'world_boss_close_skipped', status: currentState.status },
      '[WORLD BOSS] Aucun world boss en inscription à résoudre',
    );
    return null;
  }

  logger.info(
    {
      event: 'world_boss_resolving',
      worldBossId: currentState.worldBossId,
      defendersCount: currentState.defenders.length,
    },
    '[WORLD BOSS] Clôture des inscriptions et résolution',
  );

  const resolvedState = resolveWorldBoss(currentState);
  await saveWorldBossState(resolvedState);

  const reward = await applyWorldBossRewards(resolvedState);

  const finalState: WorldBossState = {
    ...resolvedState,
    status: 'reward_pending',
    reward,
  };
  await saveWorldBossState(finalState);

  await archiveWorldBossResult(finalState, reward);

  if (client) {
    // Déjà tolérante à l'échec par serveur ; on encadre quand même pour qu'un
    // problème global (registre illisible) n'empêche pas le reset.
    try {
      await broadcastWorldBossEmbed(client, buildWorldBossResultEmbed(finalState));
    } catch (error) {
      logger.error(
        {
          event: 'world_boss_announce_failed',
          worldBossId: finalState.worldBossId,
          error: error instanceof Error ? error.message : String(error),
        },
        '[WORLD BOSS] Diffusion du résultat impossible, le cycle se termine quand même',
      );
    }
  }

  await resetWorldBossState();

  logger.info(
    { event: 'world_boss_reset', worldBossId: finalState.worldBossId },
    '[WORLD BOSS] État réinitialisé, cycle terminé',
  );

  return finalState;
}

/**
 * DEUX crons pour tout le parc, pas un couple par serveur : le world boss est
 * un événement unique. Boucler sur le registre ici produirait N ouvertures et
 * N résolutions du même événement.
 */
export function startWorldBossScheduler(client: Client): void {
  discordClient = client;

  const isProduction = getWorldBossSchedulerMode() === 'production';
  const openExpression = isProduction ? getWorldBossStartCron() : DEBUG_OPEN_CRON;
  const closeExpression = isProduction ? getWorldBossEndCron() : DEBUG_CLOSE_CRON;

  cron.schedule(
    openExpression,
    () => {
      void openWorldBoss(client).catch((error) => {
        logger.error(
          {
            event: 'world_boss_open_failed',
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
          '[WORLD BOSS] Ouverture impossible',
        );
      });
    },
    { timezone: WORLD_BOSS_TIMEZONE },
  );

  cron.schedule(
    closeExpression,
    () => {
      void closeWorldBossAndResolve(client).catch((error) => {
        logger.error(
          {
            event: 'world_boss_close_failed',
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
          '[WORLD BOSS] Clôture impossible',
        );
      });
    },
    { timezone: WORLD_BOSS_TIMEZONE },
  );

  logger.info(
    { event: 'world_boss_scheduler_started', openExpression, closeExpression, isProduction },
    '[WORLD BOSS] Scheduler mondial démarré',
  );
}
