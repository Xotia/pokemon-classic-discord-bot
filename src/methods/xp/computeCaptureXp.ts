import { getRarityXpMultiplier } from "../../config/rarityXp";
import { METEORITE_XP_MULTIPLIER } from "../../features/meteoriteEvent/meteoriteEventConfig";

const SHINY_XP_MULTIPLIER = 10;

// XP d'une capture : PV de base × rareté × shiny × bonus météorite.
export function computeCaptureXp(
  baseHp: number,
  rarity: string,
  isShiny: boolean,
  hasMeteoriteBonus: boolean,
): number {
  let gainedXp = Math.round(baseHp * getRarityXpMultiplier(rarity));
  if (isShiny) gainedXp *= SHINY_XP_MULTIPLIER;
  if (hasMeteoriteBonus) gainedXp *= METEORITE_XP_MULTIPLIER;
  return gainedXp;
}
