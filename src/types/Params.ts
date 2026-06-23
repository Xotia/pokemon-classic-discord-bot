export type BuildDescriptionParams = {
  pokemon: any;
  isShiny: boolean;
  isNewPokemon: boolean;
  trainerName: string;
  zone?: string;
};

export type EditFooterParams = {
  pokemonName: string;
  isInPokedex: boolean;
  trainerName: string;
  gainedXp?: number;
  leveledUp?: boolean;
  newLevel?: number;
};

export type BuildCapturedPokemonEmbedParams = {
  player: any;
  playerId: string;
  pokemon: any;
  isShiny: boolean;
  trainerName: string;
  gainedXp?: number;
  leveledUp?: boolean;
  newLevel?: number;
  isAlreadyInPokedex?: boolean;
  zone?: string;
};

