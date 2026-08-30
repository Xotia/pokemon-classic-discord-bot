/** Difficulté d'un premier événement, ou d'un événement précédent sans inscrit. */
export const DEFAULT_WORLD_BOSS_DIFFICULTY = 6;

/**
 * La difficulté vaut le nombre de participants du world boss précédent.
 *
 * La clause de repli n'est pas cosmétique : sans elle, un événement désert
 * ramènerait la difficulté à 0, donc un boss aux statistiques nulles et une
 * victoire automatique.
 */
export function computeWorldBossDifficulty(previousParticipantsCount: number): number {
  return previousParticipantsCount > 0 ? previousParticipantsCount : DEFAULT_WORLD_BOSS_DIFFICULTY;
}
