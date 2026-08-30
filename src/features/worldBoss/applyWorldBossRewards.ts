import { addXp } from '../../methods/xp/xp';
import logger from '../../utils/logger';
import { updatePlayers } from '../../utils/jsonPlayers';
import { groupDefendersByGuild } from './buildWorldBossTeamEmbed';
import { PlayersRecord } from '../../types/Player';
import { WorldBossReward } from '../../types/worldBoss/WorldBossReward';
import { WorldBossState } from '../../types/worldBoss/WorldBossState';

/**
 * Le world boss est hebdomadaire, mondial et à sens unique (pas de capture, pas
 * de déblocage de zone) : le gain est multiplié pour rester à la hauteur d'un
 * rendez-vous par semaine face à un raid quotidien.
 */
const WORLD_BOSS_REWARD_MULTIPLIER = 10;

const NO_REWARD: WorldBossReward = {
  rewardPerPlayer: 0,
  worldBossWin: false,
  rewardedUserIds: [],
};

/**
 * Applique les récompenses aux participants, sur leur serveur d'inscription.
 *
 * Les participants sont répartis sur plusieurs `players.json` : les gains sont
 * donc GROUPÉS par serveur, avec un seul `updatePlayers` par serveur (qui prend
 * le verrou du fichier une fois), jamais un appel par joueur.
 *
 * Un joueur dont le profil a disparu du serveur est ignoré : il ne doit pas
 * faire échouer les gains des autres.
 */
export async function applyWorldBossRewards(state: WorldBossState): Promise<WorldBossReward> {
  const boss = state.boss;

  if (!state.result?.success || !boss) {
    logger.info(
      { event: 'world_boss_rewards_skipped', worldBossId: state.worldBossId },
      '[WORLD BOSS] World boss non vaincu, aucune récompense appliquée',
    );
    return NO_REWARD;
  }

  // Les PV finaux du boss servent aux deux ressources, comme pour le raid.
  const rewardPerPlayer = boss.baseStats.hp * boss.difficulty * WORLD_BOSS_REWARD_MULTIPLIER;
  const rewardedUserIds: string[] = [];

  for (const group of groupDefendersByGuild(state.defenders)) {
    const userIds = group.defenders.map((defender) => defender.userId);

    try {
      await updatePlayers(group.guildId, (players: PlayersRecord) => {
        for (const userId of userIds) {
          const player = players[userId];
          if (!player) continue;

          const xpResult = addXp(player.xp ?? 0, rewardPerPlayer);
          player.xp = xpResult.xp;
          player.level = xpResult.level;
          player.researchData =
            (typeof player.researchData === 'number' ? player.researchData : 0) + rewardPerPlayer;
          player.worldBossWins = (player.worldBossWins ?? 0) + 1;

          rewardedUserIds.push(userId);
        }
      });
    } catch (error) {
      // Un serveur illisible ne doit pas priver les autres de leurs gains.
      logger.error(
        {
          event: 'world_boss_rewards_failed',
          worldBossId: state.worldBossId,
          guildId: group.guildId,
          error: error instanceof Error ? error.message : String(error),
        },
        '[WORLD BOSS] Récompenses impossibles sur ce serveur, les autres continuent',
      );
    }
  }

  logger.info(
    {
      event: 'world_boss_rewards_applied',
      worldBossId: state.worldBossId,
      bossId: boss.id,
      rewardPerPlayer,
      rewardedCount: rewardedUserIds.length,
      participantsCount: state.defenders.length,
    },
    '[WORLD BOSS] Récompenses appliquées',
  );

  return { rewardPerPlayer, worldBossWin: true, rewardedUserIds };
}
