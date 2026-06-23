export interface PokemonCaptureStats {
  total: number;
  shiny: number;
  capturedInCurrentSeason: boolean;
}

export interface Player {
  name: string;
  captureList?: Record<string, PokemonCaptureStats>;
  lastCapture?: number;
  pityCounter: number;
  xp: number;
  level: number;
  raidWins?: number;
}

export type PlayersRecord = Record<string, Player>;