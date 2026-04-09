export interface PokemonCaptureStats {
  total: number;
  shiny: number;
}

export interface Player {
  name: string;
  captureList: Record<number, PokemonCaptureStats>;
  lastCapture?: number;
  pityCounter: number;
}

export type PlayersRecord = Record<string, Player>;