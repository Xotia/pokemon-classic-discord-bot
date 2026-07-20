import { getPokemonCatalog } from "../../utils/pokemonCatalog";
import { Pokemon } from "../../types/Pokemon";

export function getPokemonById(guildId: string, id: number): Pokemon | null {
  const catalog = getPokemonCatalog(guildId);
  return catalog.find((p) => p.id === id) ?? null;
}
