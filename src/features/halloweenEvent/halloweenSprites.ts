import fs from "node:fs";
import { HALLOWEEN_SPRITES_DB } from "../../config/paths";
import { isHalloweenEventActive } from "./halloweenEventConfig";

interface HalloweenSprite {
  image?: string;
  shinyImage?: string;
}

type HalloweenSpriteCatalog = Record<string, HalloweenSprite>;

let cache: HalloweenSpriteCatalog | null = null;

function loadCatalog(): HalloweenSpriteCatalog {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(HALLOWEEN_SPRITES_DB, "utf-8")) as HalloweenSpriteCatalog;
  } catch {
    // Fichier absent ou illisible : aucune surcharge.
    cache = {};
  }
  return cache;
}

/** Vide le cache (tests). */
export function resetHalloweenSpritesCache(): void {
  cache = null;
}

/**
 * Sprite surchargé pour l'évènement Halloween, ou undefined. Actif pendant
 * toute la fenêtre de l'évènement, dans toutes les zones.
 */
export function getEventSprite(
  pokemon: { id: number | string },
  isShiny: boolean,
  now = new Date(),
): string | undefined {
  if (!isHalloweenEventActive(now)) return undefined;
  const entry = loadCatalog()[String(pokemon.id)];
  const url = isShiny ? entry?.shinyImage : entry?.image;
  return url || undefined;
}
