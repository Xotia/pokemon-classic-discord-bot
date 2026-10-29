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

/**
 * Mode de tirage de la capture ciblée (option deja_capture) :
 * - "captured" : uniquement des Pokémon déjà capturés (coût réduit de moitié) ;
 * - "uncaptured" : uniquement des Pokémon jamais capturés (coût plein) ;
 * - "all" : option absente, tous les Pokémon de la rareté (coût ÷1,5).
 */
export type TargetedCaptureMode = "captured" | "uncaptured" | "all";

/** Diviseurs appliqués au coût de base selon le mode. */
export const CAPTURED_COST_DIVISOR = 2;
export const ALL_COST_DIVISOR = 1.5;

/** Convertit l'option booléenne deja_capture (null si absente) en mode. */
export function getTargetedCaptureMode(dejaCapture: boolean | null | undefined): TargetedCaptureMode {
  if (dejaCapture === true) return "captured";
  if (dejaCapture === false) return "uncaptured";
  return "all";
}

/** Coût effectif d'une capture ciblée, entier (arrondi au supérieur). */
export function getTargetedCaptureCost(rarity: TargetableRarity, mode: TargetedCaptureMode): number {
  const base = getResearchCost(rarity);
  if (mode === "captured") return Math.ceil(base / CAPTURED_COST_DIVISOR);
  if (mode === "all") return Math.ceil(base / ALL_COST_DIVISOR);
  return base;
}

export function isTargetableRarity(value: string): value is TargetableRarity {
  return Object.prototype.hasOwnProperty.call(RESEARCH_COST, value);
}
