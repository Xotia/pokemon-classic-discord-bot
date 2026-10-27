import { getRarityXpMultiplier } from "../../config/rarityXp";

const SHINY_XP_MULTIPLIER = 10;

// XP d'une capture : PV de base × rareté × shiny × multiplicateur de la zone d'évènement (1 hors évènement).
export function computeCaptureXp(
  baseHp: number,
  rarity: string,
  isShiny: boolean,
  eventXpMultiplier: number,
): number {
  let gainedXp = Math.round(baseHp * getRarityXpMultiplier(rarity));
  if (isShiny) gainedXp *= SHINY_XP_MULTIPLIER;
  gainedXp *= eventXpMultiplier;
  return gainedXp;
}
