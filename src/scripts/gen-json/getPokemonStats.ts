export function getPokemonStats(pokemonStats: any) {
  const [hp, attack, defense, specialAttack, specialDefense, speed] =
    pokemonStats.map((stat: any) => stat.base_stat);

  return {
    hp,
    attack,
    defense,
    specialAttack,
    specialDefense,
    speed,
  };
}
