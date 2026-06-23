export type Rarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'very_rare'
  | 'epic'
  | 'ultra_rare'
  | 'mythic'
  | 'legendary'
  | 'unknown';

export interface RarityData {
  rarity: Rarity;
  weight: number;
  color: number;
  french: string;
}

export const rarityList: RarityData[] = [
  { rarity: 'common', weight: 30600, color: 0x9E9E9E, french: 'Commun' },
  { rarity: 'uncommon', weight: 25000, color: 0x4CAF50, french: 'Peu commun' },
  { rarity: 'rare', weight: 20000, color: 0x03A9F4, french: 'Rare' },
  { rarity: 'very_rare', weight: 12000, color: 0x00BCD4, french: 'Très rare' },
  { rarity: 'epic', weight: 7000, color: 0x9C27B0, french: 'Épique' },
  { rarity: 'ultra_rare', weight: 4000, color: 0xFF9800, french: 'Ultra-Rare' },
  { rarity: 'mythic', weight: 1000, color: 0xE91E63, french: 'Mythique' },
  { rarity: 'legendary', weight: 300, color: 0xFFD700, french: 'Légendaire' },
  { rarity: 'unknown', weight: 100, color: 0xCCCCCC, french: 'Inconnu' },
];

export const rarityBoostedList: RarityData[] = [
  { rarity: 'rare', weight: 24000, color: 0x03A9F4, french: 'Rare' },
  { rarity: 'very_rare', weight: 25000, color: 0x00BCD4, french: 'Très rare' },
  { rarity: 'epic', weight: 20000, color: 0x9C27B0, french: 'Épique' },
  { rarity: 'ultra_rare', weight: 15000, color: 0xFF9800, french: 'Ultra-Rare' },
  { rarity: 'mythic', weight: 10000, color: 0xE91E63, french: 'Mythique' },
  { rarity: 'legendary', weight: 5000, color: 0xFFD700, french: 'Légendaire' },
  { rarity: 'unknown', weight: 1000, color: 0xCCCCCC, french: 'Inconnu' },
];

export const RARITY_ORDER = [
  "common",
  "uncommon",
  "rare",
  "very_rare",
  "epic",
  "ultra_rare",
  "mythic",
  "legendary",
  "unknown",
] as const satisfies readonly Rarity[];