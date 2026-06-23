import { RARITY_ORDER, Rarity }  from "./../../config/rarity";

export function downgradeRarity(rarity: Rarity): Rarity | null {
  switch (rarity) {
    case 'unknown': return 'legendary';
    case 'legendary': return 'mythic';
    case 'mythic': return 'ultra_rare';
    case 'ultra_rare': return 'epic';
    case 'epic': return 'very_rare';
    case 'very_rare': return 'rare';
    case 'rare': return 'uncommon';
    case 'uncommon': return 'common';
    case 'common': return null;
    default: return null;
  }
}