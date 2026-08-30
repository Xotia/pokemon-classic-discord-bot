import logger from '../../utils/logger';
import { updateWorldBossState } from './worldBossState.service';
import { RegisterWorldBossDefenderParams } from '../../types/worldBoss/RegisterWorldBossDefenderParams';
import { WorldBossState } from '../../types/worldBoss/WorldBossState';

function assertWorldBossIsOpenForRegistration(state: WorldBossState): void {
  if (state.status !== 'registration' || !state.boss) {
    throw new Error('WORLD_BOSS_NOT_OPEN');
  }

  if (!state.registrationClosesAt) {
    throw new Error('WORLD_BOSS_STATE_INVALID');
  }

  if (Date.now() > new Date(state.registrationClosesAt).getTime()) {
    throw new Error('WORLD_BOSS_REGISTRATION_CLOSED');
  }
}

/**
 * Inscrit (ou ré-inscrit) un joueur dans l'équipe mondiale.
 *
 * L'unicité porte sur le seul `userId` Discord, PAS sur `(guildId, userId)` :
 * un joueur présent sur deux serveurs ne doit pas pouvoir s'inscrire deux fois
 * pour doubler ses récompenses. Une nouvelle inscription remplace donc la
 * précédente quel que soit le serveur d'origine, et le `guildId` enregistré
 * devient celui de la dernière inscription — c'est ce profil-là qui sera
 * récompensé.
 *
 * L'ensemble se fait sous le verrou du fichier d'état : les inscriptions
 * arrivent en parallèle depuis tous les serveurs.
 */
export async function registerWorldBossDefender(
  params: RegisterWorldBossDefenderParams,
): Promise<WorldBossState> {
  return updateWorldBossState((state) => {
    assertWorldBossIsOpenForRegistration(state);

    const previous = state.defenders.find((defender) => defender.userId === params.userId);

    state.defenders = [
      ...state.defenders.filter((defender) => defender.userId !== params.userId),
      { ...params, registeredAt: new Date().toISOString() },
    ];

    logger.info(
      {
        event: 'world_boss_registered',
        worldBossId: state.worldBossId,
        userId: params.userId,
        guildId: params.guildId,
        previousGuildId: previous?.guildId ?? null,
        pokemonName: params.pokemonName,
        attackType: params.attackType,
        defendersCount: state.defenders.length,
      },
      '[WORLD BOSS] Inscription enregistrée',
    );

    return state;
  });
}
