import { Rarity } from "../config/rarity";

export interface PokemonCaptureStats {
  total: number;
  shiny: number;
  capturedInCurrentSeason: boolean;
}

// Suivi d'un évènement : uniquement des faits, les scores sont calculés à la lecture.
export interface ContestProgress {
  captures: Partial<Record<Rarity, number>>;
  pumpkins: number;
}

export interface Player {
  name: string;
  captureList?: Record<string, PokemonCaptureStats>;
  lastCapture?: number;
  pityCounter: number;
  lastDailyBoostDay?: string;
  xp: number;
  level: number;
  raidWins?: number;
  worldBossWins?: number;
  researchData: number;
  // Inventaire générique : id d'objet (config/items.ts) -> quantité.
  items?: Record<string, number>;
  // Suivi par évènement, clé = id d'évènement (ex. "halloween2026").
  events?: Record<string, ContestProgress>;
}

export type PlayersRecord = Record<string, Player>;
