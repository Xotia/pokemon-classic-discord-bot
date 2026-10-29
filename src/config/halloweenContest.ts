import { Rarity } from "./rarity";

// Clé du suivi dans `Player.events` : un futur évènement ne se mélange pas au concours.
export const HALLOWEEN_CONTEST_EVENT_ID = "halloween2026";

// D5 : chance de trouver une citrouille par capture réussie dans le Manoir.
// Frontière : le tirage `random() < PUMPKIN_DROP_CHANCE` donne une citrouille,
// donc 0.14 en donne une et 0.15 non.
export const PUMPKIN_DROP_CHANCE = 0.15;

// Points d'une citrouille (≈ une capture rare).
export const PUMPKIN_POINTS = 3;

// Barème par rareté (D4). Le score est calculé à la lecture : ce barème peut
// changer jusqu'à la fin de l'évènement sans migrer de données.
export const RARITY_CONTEST_POINTS: Partial<Record<Rarity, number>> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  very_rare: 5,
  epic: 8,
  ultra_rare: 12,
  mythic: 20,
  legendary: 30,
  legendary_wandering: 30,
};

// Rareté absente du barème (« unknown », valeur inattendue) : 1 point plutôt
// que 0, pour qu'une capture réelle dans le Manoir ne soit jamais comptée pour rien.
export const UNKNOWN_RARITY_POINTS = 1;
