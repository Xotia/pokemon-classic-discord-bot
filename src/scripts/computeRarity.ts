import { fetchSpecies } from "./fetchSpecies";
import { fetchEncounters } from "./fetchEncounters";
import { fetchEvolutionChain } from "./fetchEvolutionChain";
import {
  isOneTimeOnly,
  computeEncounterRateComponent,
  computeGamesComponent,
  computeMethodComponent,
  computeExclusivityComponent,
  computeEvolutionComponent,
  computeOneTimeOnlyComponent,
  mapScoreToRarityTier,
  applyEpicFloor,
} from "./rarityScoring";
import { RarityResult } from "../types/RarityResult";

const WEIGHT_ENCOUNTER_RATE = 0.25;
const WEIGHT_GAMES = 0.15;
const WEIGHT_METHOD = 0.15;
const WEIGHT_EXCLUSIVITY = 0.1;
const WEIGHT_EVOLUTION = 0.1;
const WEIGHT_ONE_TIME_ONLY = 0.05;

// Sum of the weights above (0.80): the legendary/mythical criterion (20%)
// is fully handled by the priority rules, so the composite score is
// rescaled back onto a 0-100 range using this constant.
const COMPOSITE_WEIGHT_SUM = 0.8;

export async function computeRarity(id: number): Promise<RarityResult> {
  let species: any;
  try {
    species = await fetchSpecies(id);
  } catch (err) {
    return {
      id,
      rarity: "unknown",
      appliedRule: "priority:species_fetch_failed",
      finalScore: null,
      components: null,
      oneTimeOnly: false,
      flooredToEpic: false,
    };
  }

  if (species.is_mythical === true) {
    return {
      id,
      rarity: "mythic",
      appliedRule: "priority:is_mythical",
      finalScore: null,
      components: null,
      oneTimeOnly: false,
      flooredToEpic: false,
    };
  }

  if (species.is_legendary === true) {
    return {
      id,
      rarity: "legendary",
      appliedRule: "priority:is_legendary",
      finalScore: null,
      components: null,
      oneTimeOnly: false,
      flooredToEpic: false,
    };
  }

  const encounters = await fetchEncounters(id);

  if (Array.isArray(encounters) && encounters.length === 0) {
    return {
      id,
      rarity: "ultra_rare",
      appliedRule: "priority:no_encounters_absent",
      finalScore: null,
      components: null,
      oneTimeOnly: false,
      flooredToEpic: false,
    };
  }

  const evolutionChain = await fetchEvolutionChain(species.evolution_chain.url);

  const c1_encounterRate = computeEncounterRateComponent(encounters);
  const c3_games = computeGamesComponent(encounters);
  const c4_method = computeMethodComponent(encounters);
  const c5_exclusivity = computeExclusivityComponent(encounters);
  const c6_evolution = computeEvolutionComponent(evolutionChain, species.name);
  const c7_oneTimeOnly = computeOneTimeOnlyComponent(encounters);

  const rawScore =
    WEIGHT_ENCOUNTER_RATE * c1_encounterRate +
    WEIGHT_GAMES * c3_games +
    WEIGHT_METHOD * c4_method +
    WEIGHT_EXCLUSIVITY * c5_exclusivity +
    WEIGHT_EVOLUTION * c6_evolution +
    WEIGHT_ONE_TIME_ONLY * c7_oneTimeOnly;

  const finalScore = Math.min(100, Math.max(0, rawScore / COMPOSITE_WEIGHT_SUM));

  const oneTimeOnly = isOneTimeOnly(encounters);
  const tierBeforeFloor = mapScoreToRarityTier(finalScore);
  const rarity = applyEpicFloor(tierBeforeFloor, oneTimeOnly);

  return {
    id,
    rarity,
    appliedRule: "composite",
    finalScore,
    components: {
      c1_encounterRate,
      c3_games,
      c4_method,
      c5_exclusivity,
      c6_evolution,
      c7_oneTimeOnly,
    },
    oneTimeOnly,
    flooredToEpic: rarity !== tierBeforeFloor,
  };
}
