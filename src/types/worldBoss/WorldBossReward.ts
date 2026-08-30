/**
 * Récompenses appliquées à la résolution. Le même montant alimente l'XP et les
 * données de recherche (voir la spec, section « Récompenses »).
 */
export type WorldBossReward = {
  rewardPerPlayer: number;
  worldBossWin: boolean;
  rewardedUserIds: string[];
};
