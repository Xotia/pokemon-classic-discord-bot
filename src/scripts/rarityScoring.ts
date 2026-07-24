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

// Gen 1 game versions (Red/Blue/Yellow + the direct Gen-3-era remakes
// FireRed/LeafGreen): used to scope encounter data down to games actually
// relevant to the Kanto dex, instead of PokéAPI's all-generations aggregate.
export const GEN1_VERSIONS = new Set([
  "red",
  "blue",
  "yellow",
  "firered",
  "leafgreen",
]);

// Gen 2 game versions (Gold/Silver/Crystal + the direct Gen-4-era remakes
// HeartGold/SoulSilver): used to scope encounter data down to games actually
// relevant to the Johto dex, instead of PokéAPI's all-generations aggregate.
export const GEN2_VERSIONS = new Set([
  "gold",
  "silver",
  "crystal",
  "heartgold",
  "soulsilver",
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

// The max single-location encounter chance (%) that counts as "fully
// common" for C1. A single species rarely holds more than ~50% of a
// location's whole encounter table (it's shared with other species) — a
// species at 50%+ anywhere is already about as common as it gets in
// practice, so there's no reason to keep scaling all the way to a
// (largely unreachable) 100% before floors out at C1=0.
export const REFERENCE_MAX_CHANCE = 50;

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
  "devon-scope": 100,
  "npc-trade": 100,
};

// Methods representing a scripted/guaranteed encounter (a fixed decor
// object you interact with, an NPC gift, a one-of-a-kind spot, an NPC
// trade) rather than a genuine wild spawn roll. A 100% chance on one of
// these doesn't mean the species is common — it means the trigger is
// guaranteed once found. These must be excluded from the encounter-RATE
// calculation (C1), even though they still appear in the raw `methods`
// list and still count toward C4/C7 via the functions that specifically
// look for them.
const FIXED_ENCOUNTER_METHODS = new Set([
  "gift",
  "gift-egg",
  "only-one",
  "devon-scope",
  "npc-trade",
]);

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
 * Entries using a FIXED_ENCOUNTER_METHODS method (scripted/guaranteed
 * triggers, not genuine wild spawns) are skipped — but ONLY when a
 * genuine wild alternative exists elsewhere in the data (e.g. Kecleon:
 * devon-scope is ignored because walk/horde entries are also present).
 * If fixed/scripted methods are the ONLY data available at all (e.g. a
 * starter's sole "gift" entry), there's nothing else to go on, so they
 * are used as-is instead of falling back to the "nothing found" worst
 * case — that fallback is for genuine data gaps, not for a Pokémon whose
 * only obtainment method happens to be scripted.
 * Returns the MAXIMUM of these per-group sums across all groups, or null
 * if no qualifying numeric `chance` was found anywhere.
 */
function computeMaxGroupedEncounterChance(encounters: any[]): number | null {
  let hasGenuineWildEntry = false;
  for (const locationEntry of encounters ?? []) {
    for (const versionDetail of locationEntry?.version_details ?? []) {
      for (const detail of versionDetail?.encounter_details ?? []) {
        if (
          typeof detail?.chance === "number" &&
          !FIXED_ENCOUNTER_METHODS.has(detail?.method?.name)
        ) {
          hasGenuineWildEntry = true;
          break;
        }
      }
      if (hasGenuineWildEntry) break;
    }
    if (hasGenuineWildEntry) break;
  }

  const groupSums = new Map<string, number>();
  let found = false;

  for (const locationEntry of encounters ?? []) {
    const locationName = locationEntry?.location_area?.name;
    const versionDetails = locationEntry?.version_details ?? [];
    for (const versionDetail of versionDetails) {
      const versionName = versionDetail?.version?.name;
      const encounterDetails = versionDetail?.encounter_details ?? [];
      for (const detail of encounterDetails) {
        const methodName = detail?.method?.name;
        if (hasGenuineWildEntry && FIXED_ENCOUNTER_METHODS.has(methodName)) continue;
        if (typeof detail?.chance === "number") {
          found = true;
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
 * C1 — Encounter rate (weight 0.30).
 * Rarer Pokémon have a lower max encounter chance across all games,
 * scaled against REFERENCE_MAX_CHANCE rather than a flat 100%.
 */
export function computeEncounterRateComponent(encounters: any[]): number {
  const maxChance = computeMaxGroupedEncounterChance(encounters);

  // No numeric "chance" found at all (e.g. only gift-style entries with
  // no roaming chance): treat as the rarest case rather than crash.
  if (maxChance === null) return 100;

  return clamp(100 - (maxChance / REFERENCE_MAX_CHANCE) * 100, 0, 100);
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
 * The more distinct (landmark, version) pairs a Pokémon appears in — i.e.
 * the more real-world landmarks it's found at, across the more games — the
 * more common it is. `pairsCount` is computed by the caller (asynchronously,
 * since it requires resolving each raw sub-area to its parent landmark via
 * PokéAPI) — this function is the pure formula applied to that count.
 */
export function computeGamesComponent(pairsCount: number): number {
  return clamp(100 - (pairsCount / REFERENCE_MAX_AVAILABILITY) * 100, 0, 100);
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
 * C5 — Version-exclusivity (weight 0.05).
 * Reuses the distinct-version count from C3.
 *
 * Only 1-2 distinct versions represents genuine version-pair-level
 * exclusivity. 3+ versions is the NORMAL baseline presence pattern for an
 * ordinary Hoenn-native Pokémon in this pipeline's 7-version Gen 3 scope
 * (most such species are simply absent from the Kanto remakes FireRed/
 * LeafGreen and from the ORAS remakes in our tracked encounter data, which
 * lands them at exactly 3 native versions — ruby/sapphire/emerald — with
 * no genuine rarity/exclusivity signal at all). Scoring that baseline case
 * with any nonzero value inflated several Pokémon's composite scores above
 * their correct tier (e.g. Linéon, Grainipiot), so 3+ versions scores 0.
 */
export function computeExclusivityComponent(encounters: any[]): number {
  const nativeVersionsCount = collectDistinctVersionNames(encounters).size;
  if (nativeVersionsCount <= 1) return 100;
  if (nativeVersionsCount === 2) return 50;
  return 0;
}

interface EvolutionDetailEntry {
  trigger?: { name?: string };
  min_happiness?: unknown;
  min_beauty?: unknown;
  min_affection?: unknown;
  held_item?: unknown;
  known_move?: unknown;
  known_move_type?: unknown;
  location?: unknown;
  needs_overworld_rain?: unknown;
  party_species?: unknown;
  party_type?: unknown;
  relative_physical_stats?: unknown;
  time_of_day?: unknown;
  trade_species?: unknown;
  turn_upside_down?: unknown;
  near_special_rock?: unknown;
  min_steps?: unknown;
  min_move_count?: unknown;
  min_damage_taken?: unknown;
  [key: string]: any;
}

interface EvolutionChainNode {
  species: { name: string; url?: string };
  evolution_details: EvolutionDetailEntry[];
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

// Fields on a PokéAPI `evolution_details` entry that, when meaningfully set
// on a "level-up" trigger, signal a real hassle (a happiness/beauty grind, a
// held item, a specific time of day, etc.) rather than a plain level-up.
// `time_of_day` is included here too: PokéAPI uses `""` (not `null`) for
// "not applicable" on this field, which the generic meaningful-value check
// below already treats as unset.
const LEVEL_UP_HASSLE_FIELDS = [
  "min_happiness",
  "min_beauty",
  "min_affection",
  "held_item",
  "known_move",
  "known_move_type",
  "location",
  "needs_overworld_rain",
  "party_species",
  "party_type",
  "relative_physical_stats",
  "time_of_day",
  "trade_species",
  "turn_upside_down",
  "near_special_rock",
  "min_steps",
  "min_move_count",
  "min_damage_taken",
] as const;

// PokéAPI's own "unset" sentinels for these fields (false, null, 0, "").
// Anything else (a truthy string, a non-zero number, a non-null object)
// counts as a meaningful condition.
function isMeaningfulEvolutionConditionValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== false && value !== 0 && value !== "";
}

/**
 * Classifies how much of a hassle a single evolution-chain node's
 * `evolution_details` represent: `"trade"` (hardest), `"moderate"`
 * (use-item, or a level-up gated on a real condition like min_beauty/
 * held_item/time_of_day), or `"plain"` (a bare level-up, or no evolution
 * requirement at all). When multiple evolution-details entries exist,
 * the EASIEST (minimum) classification wins, matching this file's
 * existing "take the easiest available option" philosophy (see
 * computeMethodComponent/getEasiestMethod).
 */
export type EvolutionHassle = "plain" | "moderate" | "trade";

const HASSLE_ORDER: EvolutionHassle[] = ["plain", "moderate", "trade"];

export function classifyEvolutionHassle(
  evolutionDetails: { trigger?: { name?: string }; [key: string]: any }[] | undefined,
): EvolutionHassle {
  if (!evolutionDetails || evolutionDetails.length === 0) return "plain";

  let easiest: EvolutionHassle = "trade";

  for (const entry of evolutionDetails) {
    const triggerName = entry?.trigger?.name;
    let hassle: EvolutionHassle;

    if (triggerName === "trade") {
      hassle = "trade";
    } else if (triggerName === "use-item") {
      hassle = "moderate";
    } else if (triggerName === "level-up") {
      const hasMeaningfulCondition = LEVEL_UP_HASSLE_FIELDS.some((field) =>
        isMeaningfulEvolutionConditionValue(entry?.[field]),
      );
      hassle = hasMeaningfulCondition ? "moderate" : "plain";
    } else {
      hassle = "moderate";
    }

    if (HASSLE_ORDER.indexOf(hassle) < HASSLE_ORDER.indexOf(easiest)) {
      easiest = hassle;
    }
    if (easiest === "plain") break;
  }

  return easiest;
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

  const HASSLE_BONUS: Record<EvolutionHassle, number> = {
    plain: 0,
    moderate: 15,
    trade: 25,
  };

  let triggerBonus = 0;
  if (depth > 0) {
    triggerBonus = HASSLE_BONUS[classifyEvolutionHassle(node?.evolution_details)];
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
): { depth: number; trigger: string | null; hassle: EvolutionHassle } | null {
  const root = evolutionChain?.chain;
  if (!root) return null;

  const located = findSpeciesNode(root, speciesName);
  if (!located) return null;

  const { depth, node } = located;
  const trigger =
    depth > 0 ? node?.evolution_details?.[0]?.trigger?.name ?? null : null;
  const hassle = depth > 0 ? classifyEvolutionHassle(node?.evolution_details) : "plain";

  return { depth, trigger, hassle };
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

// Gen 3 pseudo-legendaries (Salamence/Drattak, Metagross/Métalosse, etc.)
// sit exactly at a base-stat total of 600, one tier below true legendaries
// despite being obtained the same way as any other wild/evolved Pokémon.
export const BASE_STAT_TOTAL_MYTHIC_THRESHOLD = 600;

/**
 * Floor keyed off base-stat total: any Pokémon at or above
 * BASE_STAT_TOTAL_MYTHIC_THRESHOLD never ranks below "mythic", regardless
 * of what the composite score or the one-time-only chain floor produced.
 * True legendary/mythical species already sit at "legendary" (above
 * "mythic" in RARITY_ORDER), so this only ever raises a tier, never
 * lowers one — same contract as applyOneTimeOnlyChainFloor.
 */
export function applyBaseStatFloor(rarity: Rarity, baseStatTotal: number): Rarity {
  if (baseStatTotal < BASE_STAT_TOTAL_MYTHIC_THRESHOLD) return rarity;

  const floorIndex = RARITY_ORDER.indexOf("mythic");
  const tierIndex = RARITY_ORDER.indexOf(rarity);

  if (tierIndex < floorIndex) return "mythic";
  return rarity;
}

/**
 * Graduated (not a hard cliff) base-stat-total tier bonus for the sub-600
 * range, below applyBaseStatFloor's absolute 600+ "mythic" floor. A Pokémon
 * with a hefty base-stat total but no other rarity signal (e.g. Feebas ->
 * Milotic, base-stat total 540, gated behind a laborious Beauty-stat grind
 * rather than any encounter/method rarity) still deserves a nudge upward.
 * 500-549 gets one extra tier step, 550-599 gets two: always additive on
 * top of whatever the composite score/floors already produced, and always
 * capped at "mythic" so it can never exceed what the 600+ floor would give.
 */
export function computeBaseStatTierBonus(baseStatTotal: number): number {
  if (baseStatTotal >= 550) return 2;
  if (baseStatTotal >= 500) return 1;
  return 0;
}

export function applyBaseStatTierBonus(rarity: Rarity, baseStatTotal: number): Rarity {
  const bonus = computeBaseStatTierBonus(baseStatTotal);
  if (bonus === 0) return rarity;
  const mythicIndex = RARITY_ORDER.indexOf("mythic");
  const currentIndex = RARITY_ORDER.indexOf(rarity);
  // Never lower an already-high tier (legendary/unknown rank above mythic):
  // the cap at mythicIndex must not pull currentIndex DOWN when it's already
  // past it, only prevent the bonus from pushing it further up than mythic.
  const newIndex = Math.max(currentIndex, Math.min(currentIndex + bonus, mythicIndex));
  return RARITY_ORDER[newIndex];
}

// Continuous, sub-500 nudge to the raw COMPOSITE score based on base-stat
// total — separate from applyBaseStatTierBonus (which handles the 500+
// range with discrete tier jumps for paths that have no numeric score at
// all). This only matters for Pokémon that DO go through ordinary
// composite scoring: a Pokémon at BST 490 (e.g. Altaria) gets nearly the
// full nudge, letting it cross a nearby tier threshold naturally instead
// of falling just short purely because 490 < 500.
const BASE_STAT_SCORE_BONUS_RANGE_START = 400;
const BASE_STAT_SCORE_BONUS_RANGE_END = 500;
const MAX_BASE_STAT_SCORE_BONUS = 10;

export function computeBaseStatScoreBonus(baseStatTotal: number): number {
  if (baseStatTotal < BASE_STAT_SCORE_BONUS_RANGE_START) return 0;
  if (baseStatTotal >= BASE_STAT_SCORE_BONUS_RANGE_END) return 0;
  const progress =
    (baseStatTotal - BASE_STAT_SCORE_BONUS_RANGE_START) /
    (BASE_STAT_SCORE_BONUS_RANGE_END - BASE_STAT_SCORE_BONUS_RANGE_START);
  return progress * MAX_BASE_STAT_SCORE_BONUS;
}

// PokéAPI has no "is this a fossil" field — this is a deliberately small,
// hardcoded set of Gen 3's fossil root species (lowercase, matching
// PokéAPI's species.name convention). Extend this list if/when other
// generations' fossils are added to this pipeline.
export const FOSSIL_ROOT_SPECIES_NAMES = new Set(["lileep", "anorith"]);

/**
 * Fossil chains get a floor ONE TIER HIGHER than the ordinary one-time-only
 * chain floor at every depth (a fossil revival is a more deliberate, rarer
 * acquisition than an ordinary starter gift): depth 0 -> at least
 * ultra_rare, depth 1+ -> at least mythic. Only ever raises, never lowers
 * — same contract as the other floor functions in this file.
 */
export function applyFossilChainFloor(
  rarity: Rarity,
  isFossilChain: boolean,
  depth: number,
): Rarity {
  if (!isFossilChain) return rarity;
  const floorTier: Rarity = depth <= 0 ? "ultra_rare" : "mythic";
  const floorIndex = RARITY_ORDER.indexOf(floorTier);
  const rarityIndex = RARITY_ORDER.indexOf(rarity);
  if (rarityIndex < floorIndex) return floorTier;
  return rarity;
}
