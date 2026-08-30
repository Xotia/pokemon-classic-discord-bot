/**
 * Traduction de la difficulté en couleur de portail.
 *
 * Les calculs ne changent pas : `boss.difficulty` reste le multiplicateur de
 * statistiques hérité du nombre de participants précédent. Seule la façon de
 * l'exposer change — les joueurs lisent une couleur, pas un `×N`.
 *
 * L'échelle est calée sur des effectifs réels : un palier par participant de
 * 1 à 9. Le dernier palier est ouvert vers le haut, sinon une mobilisation
 * exceptionnelle sortirait de l'échelle.
 */

export type WorldBossPortalTier = {
  /** Identifiant stable, pour les logs et l'archivage. */
  id: string;
  /** Nom de la couleur, tel qu'il apparaît dans « Portail vert ». */
  label: string;
  emoji: string;
  /** Couleur de l'embed Discord. */
  color: number;
  /** Difficulté minimale atteignant ce palier. */
  minDifficulty: number;
};

/** Paliers du plus calme au plus dangereux, triés par `minDifficulty`. */
export const WORLD_BOSS_PORTAL_TIERS: WorldBossPortalTier[] = [
  { id: 'green', label: 'vert', emoji: '🟢', color: 0x2ecc71, minDifficulty: 1 },
  { id: 'blue', label: 'bleu', emoji: '🔵', color: 0x3498db, minDifficulty: 2 },
  { id: 'yellow', label: 'jaune', emoji: '🟡', color: 0xf1c40f, minDifficulty: 3 },
  { id: 'orange', label: 'orange', emoji: '🟠', color: 0xe67e22, minDifficulty: 4 },
  { id: 'red', label: 'rouge', emoji: '🔴', color: 0xe74c3c, minDifficulty: 5 },
  { id: 'violet', label: 'violet', emoji: '🟣', color: 0x9b59b6, minDifficulty: 6 },
  { id: 'copper', label: 'cuivré', emoji: '🟤', color: 0xb05c2e, minDifficulty: 7 },
  // Discord traite la couleur 0x000000 comme « pas de couleur » : le noir
  // d'embed doit rester légèrement au-dessus de zéro pour s'afficher.
  { id: 'black', label: 'noir', emoji: '⚫', color: 0x0b0b0b, minDifficulty: 8 },
  { id: 'white', label: 'blanc', emoji: '⚪', color: 0xf2f3f5, minDifficulty: 9 },
];

/**
 * Palier correspondant à une difficulté. Une difficulté sous le premier seuil
 * (elle ne devrait pas exister, `computeWorldBossDifficulty` garantit >= 1)
 * retombe sur le palier le plus bas plutôt que sur `undefined`.
 */
export function getWorldBossPortalTier(difficulty: number): WorldBossPortalTier {
  let tier = WORLD_BOSS_PORTAL_TIERS[0];

  for (const candidate of WORLD_BOSS_PORTAL_TIERS) {
    if (difficulty >= candidate.minDifficulty) {
      tier = candidate;
    }
  }

  return tier;
}

/** Libellé joueur : `🟠 Portail orange`. Jamais de `×N` ici. */
export function formatWorldBossPortalTier(difficulty: number): string {
  const tier = getWorldBossPortalTier(difficulty);
  return `${tier.emoji} Portail ${tier.label}`;
}

/**
 * Désignation du portail en prose : `Portail orange`, sans pastille.
 *
 * Le caractère mondial de l'événement est porté par le texte des messages
 * (« les dresseurs de l'ensemble des centres de recherche »), pas par un
 * adjectif accolé au portail.
 */
export function formatWorldBossPortalName(difficulty: number): string {
  return `Portail ${getWorldBossPortalTier(difficulty).label}`;
}
