import { Rarity, rarityBoostedList, RarityData } from "../../config/rarity";

export function rollRaidRarity(): Rarity {
  return rollRarityFromList(rarityBoostedList);
}

export function rollRarityFromList(rarityConfig: RarityData[]): Rarity {
  const totalWeight = rarityConfig.reduce((sum, entry) => sum + entry.weight, 0);
  const random = Math.random() * totalWeight;

  let cumulative = 0;

  for (const entry of rarityConfig) {
    cumulative += entry.weight;

    if (random < cumulative) {
      return entry.rarity as Rarity;
    }
  }

  return rarityConfig[rarityConfig.length - 1].rarity as Rarity;
}