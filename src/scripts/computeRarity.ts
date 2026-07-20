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
  applyOneTimeOnlyChainFloor,
  getMaxEncounterChance,
  getDistinctVersionNames,
  getDistinctMethods,
  getEasiestMethod,
  getEvolutionInfo,
} from "./rarityScoring";
import { RarityResult, RawRarityData } from "../types/RarityResult";
import { Rarity } from "../config/rarity";

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

function getFrenchName(species: any): string {
  const frenchNameEntry = species.names?.find(
    (n: any) => n.language && n.language.name === "fr",
  );
  return frenchNameEntry ? frenchNameEntry.name : species.name;
}

/**
 * Extracts the trailing numeric id from a PokéAPI resource URL, e.g.
 * "https://pokeapi.co/api/v2/pokemon-species/252/" -> 252.
 */
function extractIdFromUrl(url: string | undefined): number | null {
  const match = url?.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export async function computeRarity(id: number): Promise<RarityResult> {
  let species: any;
  try {
    species = await fetchSpecies(id);
  } catch (err) {
    return {
      id,
      name: null,
      rarity: "unknown",
      appliedRule: "priority:species_fetch_failed",
      finalScore: null,
      components: null,
      rawData: null,
      oneTimeOnly: false,
      flooredByChain: false,
    };
  }

  const name = getFrenchName(species);

  // Fetched unconditionally (even for legendaries/mythicals/absent cases)
  // so the raw PokéAPI-derived facts can always be inspected for audit,
  // not just the final priority-rule outcome.
  const encounters = await fetchEncounters(id);
  const evolutionChain = await fetchEvolutionChain(species.evolution_chain.url);

  const versions = getDistinctVersionNames(encounters);
  const evolutionInfo = getEvolutionInfo(evolutionChain, species.name);
  const oneTimeOnly = isOneTimeOnly(encounters);
  const depth = evolutionInfo?.depth ?? 0;

  // The floor is keyed off the evolution chain's ROOT one-time-only
  // status, not this Pokémon's own: an evolution of a gifted starter
  // isn't itself a gift, but it must never rank easier to get than its
  // own base form. At depth 0 we ARE the root, so reuse what's already
  // fetched; only fetch the root's own encounters when we're not it.
  let rootOneTimeOnly = oneTimeOnly;
  if (depth > 0) {
    const rootId = extractIdFromUrl(evolutionChain?.chain?.species?.url);
    if (rootId !== null) {
      try {
        const rootEncounters = await fetchEncounters(rootId);
        rootOneTimeOnly = isOneTimeOnly(rootEncounters);
      } catch {
        // If the root's own encounters can't be fetched, fall back to
        // not flooring rather than crashing the whole computation.
        rootOneTimeOnly = false;
      }
    } else {
      rootOneTimeOnly = false;
    }
  }

  const rawData: RawRarityData = {
    isLegendary: species.is_legendary === true,
    isMythical: species.is_mythical === true,
    maxEncounterChance: getMaxEncounterChance(encounters),
    gamesCount: versions.length,
    versions,
    methods: getDistinctMethods(encounters),
    easiestMethod: getEasiestMethod(encounters),
    isVersionExclusive: versions.length <= 1,
    evolutionDepth: evolutionInfo?.depth ?? null,
    evolutionTrigger: evolutionInfo?.trigger ?? null,
  };

  // "mythic" as a rarity tier is unrelated to PokéAPI's is_mythical flag —
  // it's only ever reached via the one-time-only chain floor (3rd-stage
  // starter evolutions). A truly mythical/legendary species is always
  // "legendary" rarity, regardless of which of the two flags is set.
  if (species.is_mythical === true) {
    const rarity = applyOneTimeOnlyChainFloor("legendary", rootOneTimeOnly, depth);
    return {
      id,
      name,
      rarity,
      appliedRule: "priority:is_mythical",
      finalScore: null,
      components: null,
      rawData,
      oneTimeOnly,
      flooredByChain: rarity !== "legendary",
    };
  }

  if (species.is_legendary === true) {
    const rarity = applyOneTimeOnlyChainFloor("legendary", rootOneTimeOnly, depth);
    return {
      id,
      name,
      rarity,
      appliedRule: "priority:is_legendary",
      finalScore: null,
      components: null,
      rawData,
      oneTimeOnly,
      flooredByChain: rarity !== "legendary",
    };
  }

  if (Array.isArray(encounters) && encounters.length === 0) {
    const tierBeforeFloor: Rarity = "ultra_rare";
    const rarity = applyOneTimeOnlyChainFloor(tierBeforeFloor, rootOneTimeOnly, depth);
    return {
      id,
      name,
      rarity,
      appliedRule: "priority:no_encounters_absent",
      finalScore: null,
      components: null,
      rawData,
      oneTimeOnly,
      flooredByChain: rarity !== tierBeforeFloor,
    };
  }

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

  const tierBeforeFloor = mapScoreToRarityTier(finalScore);
  const rarity = applyOneTimeOnlyChainFloor(tierBeforeFloor, rootOneTimeOnly, depth);

  return {
    id,
    name,
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
    rawData,
    oneTimeOnly,
    flooredByChain: rarity !== tierBeforeFloor,
  };
}
