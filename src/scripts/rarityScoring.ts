import { Rarity, RARITY_ORDER } from "../config/rarity";

/**
 * Pure, side-effect-free scoring functions used to compute a Pokémon's
 * rarity tier from PokéAPI encounters/evolution-chain data.
 *
 * No network calls happen in this file: all inputs are plain objects
 * already fetched by the caller (computeRarity.ts).
 */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Gen 3 game versions (Ruby/Sapphire/Emerald/FireRed/LeafGreen + the ORAS
// remakes): used to scope encounter data down to games actually relevant
// to this generation, instead of PokéAPI's all-generations aggregate.
export const GEN3_VERSIONS = new Set([
  "ruby",
  "sapphire",
  "emerald",
  "firered",
  "leafgreen",
  "omega-ruby",
  "alpha-sapphire",
]);

/**
 * Filters raw PokéAPI encounter entries down to only the given game
 * versions. Location-area entries whose `version_details` are entirely
 * outside `allowedVersions` are dropped altogether (not kept with an
 * empty array). Pure function: returns a new array, never mutates input.
 */
export function filterEncountersToVersions(
  encounters: any[],
  allowedVersions: Set<string>,
): any[] {
  if (!Array.isArray(encounters)) return [];

  const filtered: any[] = [];
  for (const locationEntry of encounters) {
    const versionDetails = locationEntry?.version_details ?? [];
    const keptVersionDetails = versionDetails.filter((versionDetail: any) =>
      allowedVersions.has(versionDetail?.version?.name),
    );
    if (keptVersionDetails.length > 0) {
      filtered.push({ ...locationEntry, version_details: keptVersionDetails });
    }
  }
  return filtered;
}

// How many distinct (location, version) pairs counts as "widely available"
// for the C3 component. This counts every unique route/area encountered
// within every game version, not just distinct games — a Pokémon found at
// 10 routes in one game and one found at 1 route in that same game must
// NOT score identically. 25 is a reasoned-but-adjustable starting point:
// adjust this if the reference count for full availability changes.
export const REFERENCE_MAX_AVAILABILITY = 25;

export const METHOD_DIFFICULTY: Record<string, number> = {
  walk: 0,
  grass: 0,
  surf: 40,
  "old-rod": 40,
  "good-rod": 40,
  "super-rod": 40,
  "rock-smash": 40,
  cave: 40,
  headbutt: 40,
  "rough-terrain": 40,
  gift: 100,
  "gift-egg": 100,
  "only-one": 100,
  trade: 100,
};

export const DEFAULT_METHOD_DIFFICULTY = 60;

export const SCORE_THRESHOLDS: { max: number; tier: Rarity }[] = [
  { max: 15, tier: "common" },
  { max: 30, tier: "uncommon" },
  { max: 45, tier: "rare" },
  { max: 60, tier: "very_rare" },
  { max: 75, tier: "epic" },
  { max: 100, tier: "ultra_rare" },
];

/**
 * True if gift/gift-egg is the ONLY method this Pokémon is ever obtained
 * by (starters/fossils/unique NPC gifts). A Pokémon that's gifted in one
 * edition but freely wild-catchable in others (e.g. Pikachu in Yellow)
 * must NOT count as one-time-only — it's still common overall.
 */
export function isOneTimeOnly(encounters: any[]): boolean {
  if (!Array.isArray(encounters)) return false;

  const methods = new Set<string>();
  for (const locationEntry of encounters) {
    const versionDetails = locationEntry?.version_details ?? [];
    for (const versionDetail of versionDetails) {
      const encounterDetails = versionDetail?.encounter_details ?? [];
      for (const detail of encounterDetails) {
        const methodName = detail?.method?.name;
        if (methodName) methods.add(methodName);
      }
    }
  }

  const hasGift = methods.has("gift") || methods.has("gift-egg");
  if (!hasGift) return false;

  for (const method of methods) {
    if (method !== "gift" && method !== "gift-egg") return false;
  }
  return true;
}

/**
 * Groups `encounter_details` entries by location-area + version + method
 * (the three-part key that identifies a single spawn table) and sums the
 * numeric `chance` values within each group, since PokéAPI splits one
 * spawn table into multiple level-tier slots that share all three fields.
 * Returns the MAXIMUM of these per-group sums across all groups, or null
 * if no numeric `chance` was found anywhere.
 */
function computeMaxGroupedEncounterChance(encounters: any[]): number | null {
  const groupSums = new Map<string, number>();
  let found = false;

  for (const locationEntry of encounters ?? []) {
    const locationName = locationEntry?.location_area?.name;
    const versionDetails = locationEntry?.version_details ?? [];
    for (const versionDetail of versionDetails) {
      const versionName = versionDetail?.version?.name;
      const encounterDetails = versionDetail?.encounter_details ?? [];
      for (const detail of encounterDetails) {
        if (typeof detail?.chance === "number") {
          found = true;
          const methodName = detail?.method?.name;
          const groupKey = `${locationName}|${versionName}|${methodName}`;
          groupSums.set(groupKey, (groupSums.get(groupKey) ?? 0) + detail.chance);
        }
      }
    }
  }

  if (!found) return null;

  let maxGroupSum = 0;
  for (const sum of groupSums.values()) {
    if (sum > maxGroupSum) maxGroupSum = sum;
  }

  // A single location+version+method group can never legitimately exceed
  // a 100% chance (e.g. PokéAPI sometimes lists the same guaranteed
  // "devon-scope" encounter multiple times, once per hiding spot, which
  // would otherwise sum past 100 — cap it, since it's still just a
  // guaranteed encounter, not literally more-than-certain).
  return Math.min(maxGroupSum, 100);
}

/**
 * C1 — Encounter rate (weight 0.25).
 * Rarer Pokémon have a lower max encounter chance across all games.
 */
export function computeEncounterRateComponent(encounters: any[]): number {
  const maxChance = computeMaxGroupedEncounterChance(encounters);

  // No numeric "chance" found at all (e.g. only gift-style entries with
  // no roaming chance): treat as the rarest case rather than crash.
  if (maxChance === null) return 100;

  return clamp(100 - maxChance, 0, 100);
}

function collectDistinctVersionNames(encounters: any[]): Set<string> {
  const versions = new Set<string>();
  for (const locationEntry of encounters ?? []) {
    const versionDetails = locationEntry?.version_details ?? [];
    for (const versionDetail of versionDetails) {
      const versionName = versionDetail?.version?.name;
      if (versionName) versions.add(versionName);
    }
  }
  return versions;
}

function collectDistinctLocationVersionPairs(encounters: any[]): Set<string> {
  const pairs = new Set<string>();
  for (const locationEntry of encounters ?? []) {
    const locationName = locationEntry?.location_area?.name;
    const versionDetails = locationEntry?.version_details ?? [];
    for (const versionDetail of versionDetails) {
      const versionName = versionDetail?.version?.name;
      if (versionName) pairs.add(`${locationName}|${versionName}`);
    }
  }
  return pairs;
}

/**
 * C3 — Number of games (weight 0.15).
 * The more distinct (location, version) pairs a Pokémon appears in — i.e.
 * the more routes it's found at, across the more games — the more common
 * it is. Counting location+version pairs (rather than just distinct
 * versions) captures both how many games it's in AND how spread out it is
 * within each game.
 */
export function computeGamesComponent(encounters: any[]): number {
  const availabilityCount = collectDistinctLocationVersionPairs(encounters).size;
  return clamp(100 - (availabilityCount / REFERENCE_MAX_AVAILABILITY) * 100, 0, 100);
}

/**
 * C4 — Obtaining method (weight 0.15).
 * The easiest available method wins: if there's any easy way to get it,
 * it's not that rare.
 */
export function computeMethodComponent(encounters: any[]): number {
  const methods = new Set<string>();
  for (const locationEntry of encounters ?? []) {
    const versionDetails = locationEntry?.version_details ?? [];
    for (const versionDetail of versionDetails) {
      const encounterDetails = versionDetail?.encounter_details ?? [];
      for (const detail of encounterDetails) {
        const methodName = detail?.method?.name;
        if (methodName) methods.add(methodName);
      }
    }
  }

  if (methods.size === 0) return DEFAULT_METHOD_DIFFICULTY;

  let min = Infinity;
  for (const method of methods) {
    const difficulty = METHOD_DIFFICULTY[method] ?? DEFAULT_METHOD_DIFFICULTY;
    if (difficulty < min) min = difficulty;
  }
  return min;
}

/**
 * C5 — Version-exclusivity (weight 0.10).
 * Reuses the distinct-version count from C3.
 */
export function computeExclusivityComponent(encounters: any[]): number {
  const nativeVersionsCount = collectDistinctVersionNames(encounters).size;
  if (nativeVersionsCount <= 1) return 100;
  return clamp(100 - (nativeVersionsCount - 1) * 25, 0, 100);
}

const TRIGGER_BONUS: Record<string, number> = {
  "level-up": 0,
  "use-item": 15,
  trade: 25,
};

const DEFAULT_TRIGGER_BONUS = 25;

interface EvolutionChainNode {
  species: { name: string; url?: string };
  evolution_details: { trigger?: { name?: string } }[];
  evolves_to: EvolutionChainNode[];
}

interface EvolutionChainLocation {
  depth: number;
  node: EvolutionChainNode;
}

function findSpeciesNode(
  node: EvolutionChainNode,
  speciesName: string,
  depth = 0,
): EvolutionChainLocation | null {
  if (node?.species?.name === speciesName) {
    return { depth, node };
  }
  for (const child of node?.evolves_to ?? []) {
    const found = findSpeciesNode(child, speciesName, depth + 1);
    if (found) return found;
  }
  return null;
}

interface EvolutionChainLocationWithParent {
  depth: number;
  node: EvolutionChainNode;
  parent: EvolutionChainNode | null;
}

function findSpeciesNodeWithParent(
  node: EvolutionChainNode,
  speciesName: string,
  parent: EvolutionChainNode | null = null,
  depth = 0,
): EvolutionChainLocationWithParent | null {
  if (node?.species?.name === speciesName) {
    return { depth, node, parent };
  }
  for (const child of node?.evolves_to ?? []) {
    const found = findSpeciesNodeWithParent(child, speciesName, node, depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * Resolves the numeric species id of the immediate pre-evolution (parent)
 * of `speciesName` within `evolutionChain`, or null if the chain is
 * missing, the species isn't found, or the species is the chain root
 * (depth 0, no parent). Pure function, no network calls.
 */
export function getParentSpeciesId(
  evolutionChain: { chain: EvolutionChainNode } | null | undefined,
  speciesName: string,
): number | null {
  const root = evolutionChain?.chain;
  if (!root) return null;

  const located = findSpeciesNodeWithParent(root, speciesName);
  if (!located || !located.parent) return null;

  const match = located.parent.species?.url?.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

/**
 * C6 — Evolution chain position + condition (weight 0.10).
 */
export function computeEvolutionComponent(
  evolutionChain: { chain: EvolutionChainNode },
  speciesName: string,
): number {
  const root = evolutionChain?.chain;
  if (!root) return 0;

  const located = findSpeciesNode(root, speciesName);
  if (!located) return 0;

  const { depth, node } = located;
  const depthComponent = Math.min(depth, 2) * 30;

  let triggerBonus = 0;
  if (depth > 0) {
    const triggerName = node?.evolution_details?.[0]?.trigger?.name;
    triggerBonus =
      triggerName !== undefined
        ? TRIGGER_BONUS[triggerName] ?? DEFAULT_TRIGGER_BONUS
        : DEFAULT_TRIGGER_BONUS;
  }

  return clamp(depthComponent + triggerBonus, 0, 100);
}

/**
 * C7 — One-time-only (weight 0.05).
 */
export function computeOneTimeOnlyComponent(encounters: any[]): number {
  return isOneTimeOnly(encounters) ? 100 : 0;
}

/**
 * Raw encounter/spawn rate (%) behind C1 — the max "chance" value found
 * across all games, or null if no numeric chance was ever recorded.
 */
export function getMaxEncounterChance(encounters: any[]): number | null {
  return computeMaxGroupedEncounterChance(encounters);
}

/**
 * Raw list of distinct game versions the Pokémon appears in, behind C3/C5.
 */
export function getDistinctVersionNames(encounters: any[]): string[] {
  return Array.from(collectDistinctVersionNames(encounters)).sort();
}

/**
 * Raw list of distinct (location, version) pairs the Pokémon appears in,
 * behind C3.
 */
export function getDistinctLocationVersionPairs(encounters: any[]): string[] {
  return Array.from(collectDistinctLocationVersionPairs(encounters)).sort();
}

/**
 * Raw list of distinct obtaining methods found, behind C4/C7.
 */
export function getDistinctMethods(encounters: any[]): string[] {
  const methods = new Set<string>();
  for (const locationEntry of encounters ?? []) {
    const versionDetails = locationEntry?.version_details ?? [];
    for (const versionDetail of versionDetails) {
      const encounterDetails = versionDetail?.encounter_details ?? [];
      for (const detail of encounterDetails) {
        const methodName = detail?.method?.name;
        if (methodName) methods.add(methodName);
      }
    }
  }
  return Array.from(methods).sort();
}

/**
 * The single easiest (lowest-difficulty) obtaining method found, behind C4.
 */
export function getEasiestMethod(encounters: any[]): string | null {
  const methods = getDistinctMethods(encounters);
  if (methods.length === 0) return null;

  let min = Infinity;
  let easiest: string | null = null;
  for (const method of methods) {
    const difficulty = METHOD_DIFFICULTY[method] ?? DEFAULT_METHOD_DIFFICULTY;
    if (difficulty < min) {
      min = difficulty;
      easiest = method;
    }
  }
  return easiest;
}

/**
 * Raw evolution-chain position (depth + trigger) behind C6, or null if the
 * species couldn't be located in the chain.
 */
export function getEvolutionInfo(
  evolutionChain: { chain: EvolutionChainNode } | null | undefined,
  speciesName: string,
): { depth: number; trigger: string | null } | null {
  const root = evolutionChain?.chain;
  if (!root) return null;

  const located = findSpeciesNode(root, speciesName);
  if (!located) return null;

  const { depth, node } = located;
  const trigger =
    depth > 0 ? node?.evolution_details?.[0]?.trigger?.name ?? null : null;

  return { depth, trigger };
}

export function mapScoreToRarityTier(score: number): Rarity {
  for (const { max, tier } of SCORE_THRESHOLDS) {
    if (score <= max) return tier;
  }
  return "ultra_rare";
}

/**
 * Cascading, depth-based floor keyed off the evolution chain's ROOT.
 *
 * Starters/fossils/unique gifts (one-time-only at the chain root) never
 * let their evolutions fall below the root's own tier — an evolution
 * should never be easier to get than what it evolved from. The floor
 * rises with evolution depth: the root itself floors at epic, its first
 * evolution floors at ultra_rare, and further evolutions floor at mythic.
 *
 * `rootOneTimeOnly` reflects whether the CHAIN ROOT (not necessarily the
 * Pokémon being scored) is one-time-only; `depth` is the Pokémon's own
 * position in the evolution chain (0 = root).
 */
export function applyOneTimeOnlyChainFloor(
  tier: Rarity,
  rootOneTimeOnly: boolean,
  depth: number,
): Rarity {
  if (!rootOneTimeOnly) return tier;

  const floorTier: Rarity =
    depth <= 0 ? "epic" : depth === 1 ? "ultra_rare" : "mythic";

  const floorIndex = RARITY_ORDER.indexOf(floorTier);
  const tierIndex = RARITY_ORDER.indexOf(tier);

  if (tierIndex < floorIndex) return floorTier;
  return tier;
}
