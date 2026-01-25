export interface PokemonCaptureStats {
  total: number;
  shiny: number;
}

export interface Player {
  name: string;
  randomCaptures: Record<number, PokemonCaptureStats>;
  lastCapture?: number;
}

export type PlayersRecord = Record<string, Player>;