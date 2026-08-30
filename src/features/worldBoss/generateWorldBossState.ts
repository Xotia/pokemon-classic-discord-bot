import { getWorldBossRegistrationDurationMinutes } from '../../config/worldBossSettings';
import { multiplyStats } from '../raid/raidGenerator.service';
import { computeWorldBossDifficulty } from './computeWorldBossDifficulty';
import { selectWorldBoss } from './selectWorldBoss';
import { getWorldBossCatalog } from './worldBossCatalog';
import { loadWorldBossHistory } from './worldBossHistory.service';
import { createEmptyWorldBossState } from './worldBossState.service';
import { WorldBossEntry } from '../../types/worldBoss/WorldBossEntry';
import { WorldBossState } from '../../types/worldBoss/WorldBossState';

export type WorldBossGenerationOptions = {
  /** Force le boss (id d'une entrée de la liste). Sinon tirage uniforme. */
  bossId?: string;
  /** Force le multiplicateur. Sinon participants du world boss précédent. */
  difficulty?: number;
};

function createWorldBossId(): string {
  return `world-boss-${Date.now()}`;
}

function addMinutes(date: Date, minutes: number): string {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
}

/**
 * Résout le boss forcé par un administrateur. On échoue clairement plutôt que
 * de retomber sur un tirage : un forçage silencieusement ignoré est pire
 * qu'un refus, et ressusciter un boss vaincu contredirait l'annonce faite aux
 * joueurs (« ce portail est scellé »).
 */
function resolveForcedBoss(
  bossId: string,
  catalog: WorldBossEntry[],
  defeatedBossIds: string[],
): WorldBossEntry {
  const entry = catalog.find((boss) => boss.id === bossId);

  if (!entry) {
    throw new Error(`World boss inconnu : "${bossId}" n'est pas dans data/world-boss-list.json.`);
  }

  if (defeatedBossIds.includes(bossId)) {
    throw new Error(
      `World boss "${bossId}" déjà vaincu : son portail est scellé, il ne peut plus être ouvert.`,
    );
  }

  return entry;
}

function resolveForcedDifficulty(difficulty: number): number {
  if (!Number.isInteger(difficulty) || difficulty < 1) {
    throw new Error(`Difficulté forcée invalide : ${difficulty} (attendu un entier >= 1).`);
  }

  return difficulty;
}

/**
 * Assemble l'état prêt pour les inscriptions : boss tiré, difficulté dérivée du
 * nombre de participants précédent, statistiques finales et fenêtre
 * d'inscription sur le créneau global.
 *
 * Retourne `null` quand le vivier est épuisé — cas normal, pas une erreur :
 * l'événement de la semaine est simplement sauté.
 */
export async function generateWorldBossState(
  options: WorldBossGenerationOptions = {},
): Promise<WorldBossState | null> {
  const history = await loadWorldBossHistory();
  const catalog = getWorldBossCatalog();

  const entry =
    options.bossId !== undefined
      ? resolveForcedBoss(options.bossId, catalog, history.defeatedBossIds)
      : selectWorldBoss(history.defeatedBossIds, catalog);

  if (!entry) return null;

  const difficulty =
    options.difficulty !== undefined
      ? resolveForcedDifficulty(options.difficulty)
      : computeWorldBossDifficulty(history.lastParticipantsCount);

  const now = new Date();
  const createdAt = now.toISOString();

  return {
    ...createEmptyWorldBossState(),
    worldBossId: createWorldBossId(),
    status: 'registration',
    createdAt,
    registrationOpensAt: createdAt,
    registrationClosesAt: addMinutes(now, getWorldBossRegistrationDurationMinutes()),
    boss: {
      id: entry.id,
      name: entry.name,
      portal: entry.portal,
      sprite: entry.sprite,
      types: entry.types,
      attackType: entry.attackType,
      difficulty,
      baseStats: entry.stats,
      finalStats: multiplyStats(entry.stats, difficulty),
      defenseEffectiveness: entry.defenseEffectiveness,
      lore: entry.lore,
    },
  };
}
