import { getPokemonCatalog } from "../../utils/pokemonCatalog";

export function getCapturedPokemonHp(guildId: string, pokemonId: number): number {
  const catalog = getPokemonCatalog(guildId);
  const pokemonData = catalog.find((pokemon) => pokemon.id === pokemonId);

  if (!pokemonData?.stats?.hp) {
    return 0;
  }

  return pokemonData.stats.hp;
}
