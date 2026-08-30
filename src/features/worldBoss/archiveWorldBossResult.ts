import logger from '../../utils/logger';
import { getWorldBossCatalog } from './worldBossCatalog';
import { appendWorldBossHistoryEntry } from './worldBossHistory.service';
import { getAliveWorldBosses } from './selectWorldBoss';
import { WorldBossHistoryEntry } from '../../types/worldBoss/WorldBossHistory';
import { WorldBossReward } from '../../types/worldBoss/WorldBossReward';
import { WorldBossState } from '../../types/worldBoss/WorldBossState';

/**
 * Archive la résolution — TOUJOURS, y compris en défaite et à zéro participant :
 * `lastParticipantsCount` pilote la difficulté de la semaine suivante, une
 * entrée manquante la ferait repartir sur une valeur périmée.
 *
 * En cas de victoire, le retrait définitif du vivier se fait dans la même
 * écriture verrouillée que l'entrée (voir `appendWorldBossHistoryEntry`).
 */
export async function archiveWorldBossResult(
  state: WorldBossState,
  reward: WorldBossReward,
): Promise<WorldBossHistoryEntry> {
  const boss = state.boss;
  const result = state.result;

  if (!boss || !result) {
    throw new Error('WORLD_BOSS_NOT_RESOLVED');
  }

  const entry: WorldBossHistoryEntry = {
    worldBossId: state.worldBossId,
    bossId: boss.id,
    bossName: boss.name,
    difficulty: boss.difficulty,
    participantsCount: result.participantsCount,
    guildsCount: result.guildsCount,
    success: result.success,
    missingStats: result.missingStats,
    rewardPerPlayer: reward.rewardPerPlayer,
    resolvedAt: state.resolvedAt ?? new Date().toISOString(),
  };

  const history = await appendWorldBossHistoryEntry(entry);

  if (result.success) {
    let remaining: number | null = null;
    try {
      remaining = getAliveWorldBosses(history.defeatedBossIds, getWorldBossCatalog()).length;
    } catch {
      // Liste illisible : le retrait est déjà persisté, on journalise sans compte.
    }

    logger.info(
      {
        event: 'world_boss_defeated_permanently',
        worldBossId: state.worldBossId,
        bossId: boss.id,
        remainingBosses: remaining,
      },
      '[WORLD BOSS] Portail scellé, boss retiré définitivement du vivier',
    );

    if (remaining === 0) {
      logger.warn(
        { event: 'world_boss_pool_exhausted', defeatedCount: history.defeatedBossIds.length },
        '[WORLD BOSS] Vivier épuisé : plus aucun boss disponible, ajoutez des entrées à data/world-boss-list.json',
      );
    }
  }

  logger.info(
    {
      event: 'world_boss_resolved',
      worldBossId: state.worldBossId,
      bossId: boss.id,
      success: result.success,
      participantsCount: result.participantsCount,
      guildsCount: result.guildsCount,
    },
    '[WORLD BOSS] Résolution archivée',
  );

  return entry;
}
