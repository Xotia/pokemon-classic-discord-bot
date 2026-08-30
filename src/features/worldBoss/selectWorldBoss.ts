import logger from '../../utils/logger';
import { getWorldBossCatalog } from './worldBossCatalog';
import { WorldBossEntry } from '../../types/worldBoss/WorldBossEntry';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Boss encore tirables : la liste moins les ids déjà vaincus. Un id vaincu
 * absent de la liste (entrée supprimée à la main) est simplement ignoré.
 */
export function getAliveWorldBosses(
  defeatedBossIds: string[],
  catalog: WorldBossEntry[] = getWorldBossCatalog(),
): WorldBossEntry[] {
  const defeated = new Set(defeatedBossIds);
  return catalog.filter((boss) => !defeated.has(boss.id));
}

/**
 * Tirage aléatoire UNIFORME parmi les boss encore vivants : la liste est un
 * vivier, pas une progression, l'ordre des entrées n'a aucune incidence.
 *
 * Vivier épuisé : retour `null`, pas d'exception. L'ouverture hebdomadaire doit
 * pouvoir passer son tour sans casser le scheduler.
 */
export function selectWorldBoss(
  defeatedBossIds: string[],
  catalog: WorldBossEntry[] = getWorldBossCatalog(),
): WorldBossEntry | null {
  const candidates = getAliveWorldBosses(defeatedBossIds, catalog);

  if (candidates.length === 0) {
    logger.warn(
      { event: 'world_boss_pool_exhausted', catalogSize: catalog.length, defeatedCount: defeatedBossIds.length },
      '[WORLD BOSS] Vivier épuisé : tous les boss de la liste ont été vaincus, aucun événement ouvert',
    );
    return null;
  }

  return candidates[randomInt(0, candidates.length - 1)];
}
