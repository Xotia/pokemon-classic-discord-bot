import {
  computeBruteBattleResult,
  RAID_STAT_MATCHUPS,
} from '../raid/computeBruteRaidResult';
import { groupDefendersByGuild } from './buildWorldBossTeamEmbed';
import { WorldBossState } from '../../types/worldBoss/WorldBossState';

/**
 * Clôture le combat. Le calcul est celui du raid, via le moteur partagé
 * `computeBruteBattleResult` : rien n'est dupliqué ici, seul le comptage des
 * serveurs représentés est propre au world boss.
 */
export function resolveWorldBoss(state: WorldBossState): WorldBossState {
  const boss = state.boss;

  if (!boss) {
    throw new Error('WORLD_BOSS_NOT_ACTIVE');
  }

  const guildsCount = groupDefendersByGuild(state.defenders).length;
  const resolvedAt = new Date().toISOString();

  if (state.defenders.length === 0) {
    return {
      ...state,
      status: 'resolved',
      resolvedAt,
      result: {
        success: false,
        missingStats: ['attack', 'specialAttack', 'defense', 'specialDefense', 'speed'],
        participantsCount: 0,
        guildsCount: 0,
        teamStats: { hp: 0, attack: 0, specialAttack: 0, defense: 0, specialDefense: 0, speed: 0 },
        // Équipe vide : chaque écart vaut 0 moins la stat du boss AFFRONTÉE sur
        // cet axe, pas sa stat homonyme (même règle que resolveRaid).
        statDiffs: {
          hp: -boss.finalStats.hp,
          attack: -boss.finalStats[RAID_STAT_MATCHUPS.attack],
          specialAttack: -boss.finalStats[RAID_STAT_MATCHUPS.specialAttack],
          defense: -boss.finalStats[RAID_STAT_MATCHUPS.defense],
          specialDefense: -boss.finalStats[RAID_STAT_MATCHUPS.specialDefense],
          speed: -boss.finalStats[RAID_STAT_MATCHUPS.speed],
        },
      },
    };
  }

  const result = computeBruteBattleResult(boss, state.defenders);

  return {
    ...state,
    status: 'resolved',
    resolvedAt,
    result: { ...result, guildsCount },
  };
}
