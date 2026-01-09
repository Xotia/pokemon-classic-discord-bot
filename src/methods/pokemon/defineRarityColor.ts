export function defineRarityColor(catchRateRaw: number, isShiny: boolean): { color: number; rarity: string } {
  if (isShiny) {
    return { color: 0xFFD700, rarity: 'Shiny' };
  }
  
  if (catchRateRaw >= 225) {
    // Commun (255, 235, 225)
    return { color: 0x9E9E9E, rarity: 'Commun' };
  } else if (catchRateRaw >= 170) {
    // Peu commun (190, 170)
    return { color: 0x4CAF50, rarity: 'Peu commun' };
  } else if (catchRateRaw >= 120) {
    // Rare (150, 127, 120)
    return { color: 0x03A9F4, rarity: 'Rare' };
  } else if (catchRateRaw >= 75) {
    // Très rare (90, 75)
    return { color: 0x00BCD4, rarity: 'Très rare' };
  } else if (catchRateRaw >= 50) {
    // Épique (60, 50)
    return { color: 0x9C27B0, rarity: 'Épique' };
  } else if (catchRateRaw >= 35) {
    // Ultra-rare (45, 35)
    return { color: 0xFF9800, rarity: 'Ultra-rare' };
  } else if (catchRateRaw >= 25) {
    // Mythique (30, 25)
    return { color: 0xE91E63, rarity: 'Mythique' };
  } else {
    // Légendaire (3)
    return { color: 0xFFD700, rarity: 'Légendaire' };
  }
}