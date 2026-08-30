/** Une résolution archivée, écrite y compris en défaite et à zéro participant. */
export interface WorldBossHistoryEntry {
  worldBossId: string;
  bossId: string;
  bossName: string;
  difficulty: number;
  participantsCount: number;
  guildsCount: number;
  success: boolean;
  missingStats: string[];
  rewardPerPlayer: number;
  resolvedAt: string;
}

/**
 * `data/world-boss-history.json`. Les trois champs de tête sont dénormalisés
 * pour que la génération hebdomadaire n'ait pas à parcourir `entries`, mais
 * ils restent reconstructibles depuis elle (`defeatedBossIds` = les `bossId`
 * des entrées à `success: true`).
 */
export interface WorldBossHistory {
  lastParticipantsCount: number;
  lastBossId: string | null;
  defeatedBossIds: string[];
  entries: WorldBossHistoryEntry[];
}
