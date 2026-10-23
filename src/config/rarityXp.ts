import { Rarity } from "./rarity";

// Multiplicateur appliqué à l'XP (et donc aux données de recherche) d'une capture.
export const RARITY_XP_MULTIPLIER: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.15,
  rare: 1.4,
  very_rare: 1.75,
  epic: 2.5,
  ultra_rare: 3.25,
  mythic: 4.75,
  legendary: 7.5,
  legendary_wandering: 9,
  unknown: 6,
};

export function getRarityXpMultiplier(rarity: string): number {
  return Object.prototype.hasOwnProperty.call(RARITY_XP_MULTIPLIER, rarity)
    ? RARITY_XP_MULTIPLIER[rarity as Rarity]
    : 1;
}
