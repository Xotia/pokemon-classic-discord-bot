import { Rarity } from "../../config/rarity";

const boostedRarityOrder: Rarity[] = [
  'unknown',
  'legendary_wandering',
  'legendary',
  'mythic',
  'ultra_rare',
  'epic',
  'very_rare',
  'rare',
];

export function downgradeBoostedRarity(rarity: Rarity): Rarity | null {
  const index = boostedRarityOrder.indexOf(rarity);

  if (index === -1 || index === boostedRarityOrder.length - 1) {
    return null;
  }

  return boostedRarityOrder[index + 1];
}