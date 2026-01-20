export interface PokemonCaptureStats {
  total: number;
  shiny: number;
}

export interface Player {
  name: string;
  randomCaptures: Record<number, PokemonCaptureStats>;
}

export type PlayersRecord = Record<string, Player>;