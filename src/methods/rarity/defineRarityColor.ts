import { rarityList } from '../../config/rarity';

export function defineRarityColor(rarity: string, isShiny: boolean): { color: number; rarity: string } {
  if (isShiny) {
    return { color: 0xFFD700, rarity: 'Shiny' };
  }

  const rarityData = rarityList.find((r) => r.rarity === rarity);
  if (rarityData) {
    return { color: rarityData.color, rarity: rarityData.french };
  }

  return { color: 0xCCCCCC, rarity: 'Unknown' };
}