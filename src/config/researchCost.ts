import { Rarity, RARITY_ORDER } from "./rarity";

export type TargetableRarity = Exclude<Rarity, "unknown">;

export const RESEARCH_COST: Record<TargetableRarity, number> = {
  common: 3300,
  uncommon: 4000,
  rare: 5000,
  very_rare: 8500,
  epic: 14500,
  ultra_rare: 25000,
  mythic: 100000,
  legendary: 300000,
  legendary_wandering: 300000,
};

export const TARGETABLE_RARITIES: TargetableRarity[] = RARITY_ORDER.filter(
  (rarity): rarity is TargetableRarity => rarity !== "unknown",
);

export function getResearchCost(rarity: TargetableRarity): number {
  return RESEARCH_COST[rarity];
}

export function isTargetableRarity(value: string): value is TargetableRarity {
  return Object.prototype.hasOwnProperty.call(RESEARCH_COST, value);
}
