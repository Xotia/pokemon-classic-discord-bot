import { getPokemonCatalog } from "../../utils/pokemonCatalog";

/**
 * Index zone -> ids des Pokémon qui y apparaissent, construit une fois par
 * serveur à partir du catalogue.
 *
 * Le cache a exactement la même durée de vie que `catalogCache` dans
 * `utils/pokemonCatalog` : les deux vivent le temps du process et sont
 * reconstruits au redémarrage. Rien de dérivé n'est écrit sur disque, donc une
 * modification des `zones[]` d'un Pokémon ne peut pas laisser un compteur
 * périmé derrière elle.
 */
const zoneIndexCache = new Map<string, Map<string, Set<number>>>();

export function getZonePokemonIndex(guildId: string): Map<string, Set<number>> {
  const cached = zoneIndexCache.get(guildId);
  if (cached) return cached;

  const index = new Map<string, Set<number>>();

  for (const pokemon of getPokemonCatalog(guildId)) {
    // Les Pokémon sans zone (formes de Deoxys, roster custom du serveur)
    // n'appartiennent à aucune zone : ils ne comptent dans aucun total.
    for (const zoneId of pokemon.zones ?? []) {
      let bucket = index.get(zoneId);
      if (!bucket) {
        bucket = new Set<number>();
        index.set(zoneId, bucket);
      }
      bucket.add(pokemon.id);
    }
  }

  zoneIndexCache.set(guildId, index);
  return index;
}

/** Ids des Pokémon présents dans une zone. Set vide si la zone est inconnue. */
export function getZonePokemonIds(guildId: string, zoneId: string): Set<number> {
  return getZonePokemonIndex(guildId).get(zoneId) ?? new Set<number>();
}

/** Réservé aux tests : vide le cache d'index d'un serveur (ou de tous). */
export function clearZonePokemonIndexCache(guildId?: string): void {
  if (guildId) {
    zoneIndexCache.delete(guildId);
    return;
  }
  zoneIndexCache.clear();
}
