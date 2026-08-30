/** Difficulté d'un tout premier événement, quand aucun world boss n'a eu lieu. */
export const DEFAULT_WORLD_BOSS_DIFFICULTY = 6;

/** Plancher : une difficulté sous 1 annulerait les statistiques du boss. */
export const MIN_WORLD_BOSS_DIFFICULTY = 1;

/**
 * La difficulté vaut le nombre de participants du world boss précédent.
 *
 * Deux cas distincts arrivent ici, et les confondre a un coût :
 *
 * - `hasPreviousEvent === false` : aucun événement n'a jamais eu lieu, il n'y a
 *   rien à suivre. On part sur DEFAULT_WORLD_BOSS_DIFFICULTY.
 * - `hasPreviousEvent === true` avec 0 participant : la semaine précédente a
 *   été déserte. C'est une information, pas une absence d'information — la
 *   règle s'applique, bornée au plancher.
 *
 * Le plancher n'est pas cosmétique : `multiplyStats(stats, 0)` met toutes les
 * statistiques du boss à zéro. La semaine déserte elle-même reste une défaite
 * (resolveWorldBoss sort avant tout calcul sur une équipe vide), mais la
 * suivante verrait un seul dresseur battre un boss à stats nulles et retirer
 * définitivement un Gigamax d'un vivier de 33 entrées non renouvelables.
 */
export function computeWorldBossDifficulty(
  previousParticipantsCount: number,
  hasPreviousEvent: boolean,
): number {
  if (!hasPreviousEvent) {
    return DEFAULT_WORLD_BOSS_DIFFICULTY;
  }

  return Math.max(MIN_WORLD_BOSS_DIFFICULTY, Math.floor(previousParticipantsCount));
}
