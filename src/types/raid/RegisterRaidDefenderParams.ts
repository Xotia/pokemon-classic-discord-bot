export type RegisterRaidDefenderParams = {
  userId: string;
  pokemonId: number;
  pokemonName: string;
  attackType: string;
  snapshot: {
    types: string[];
    defenseEffectiveness: Record<string, number>;
    stats: {
      hp: number;
      attack: number;
      specialAttack: number;
      defense: number;
      specialDefense: number;
      speed: number;
    };
  };
};