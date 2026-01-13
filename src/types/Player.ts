export interface Player {
  name: string;
  randomCaptures: number[];
}

export type PlayersRecord = Record<string, Player>;