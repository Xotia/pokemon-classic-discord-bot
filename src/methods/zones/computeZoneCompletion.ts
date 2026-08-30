import { Player } from "../../types/Player";
import { getZonePokemonIds } from "./getZonePokemonIndex";

export interface ZoneCompletion {
  zoneId: string;
  /** Nombre de Pokémon différents présents dans la zone. */
  total: number;
  /** Nombre de ces Pokémon que le joueur possède au moins une fois. */
  captured: number;
  /** Nombre de ces Pokémon capturés au moins une fois en shiny. */
  shiny: number;
  /** Reste à capturer dans la zone. */
  missing: number;
  /** Pourcentage d'avancement, arrondi à une décimale (0 si la zone est vide). */
  percentage: number;
}

/**
 * Avancement d'un joueur sur une zone, recalculé à chaque appel.
 *
 * Un Pokémon peut appartenir à plusieurs zones : les pourcentages de deux zones
 * ne s'additionnent pas, chacun est un ratio local (capturés / présents).
 */
export function computeZoneCompletion(
  guildId: string,
  player: Player | null,
  zoneId: string,
): ZoneCompletion {
  const zonePokemonIds = getZonePokemonIds(guildId, zoneId);
  const captureList = player?.captureList ?? {};

  let captured = 0;
  let shiny = 0;

  for (const pokemonId of zonePokemonIds) {
    const stats = captureList[String(pokemonId)];
    if (!stats || stats.total <= 0) continue;
    captured += 1;
    if (stats.shiny > 0) shiny += 1;
  }

  const total = zonePokemonIds.size;
  const percentage = total === 0 ? 0 : Math.round((captured / total) * 1000) / 10;

  return {
    zoneId,
    total,
    captured,
    shiny,
    missing: total - captured,
    percentage,
  };
}
