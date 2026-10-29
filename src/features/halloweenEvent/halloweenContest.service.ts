import {
  HALLOWEEN_CONTEST_EVENT_ID,
  PUMPKIN_DROP_CHANCE,
  PUMPKIN_POINTS,
  RARITY_CONTEST_POINTS,
  UNKNOWN_RARITY_POINTS,
} from "../../config/halloweenContest";
import { PUMPKIN_ITEM_ID } from "../../config/items";
import { Rarity } from "../../config/rarity";
import { ContestProgress, Player } from "../../types/Player";
import { EVENT_START, HALLOWEEN_ZONE_ID, isHalloweenEventActive } from "./halloweenEventConfig";

export type ContestPhase = "before" | "during" | "after";

export interface ContestEntry {
  userId: string;
  name: string;
  score: number;
  progress: ContestProgress;
  /** Rang de compétition : les ex aequo partagent le même rang. */
  rank: number;
  tied: boolean;
}

export function getContestPhase(now = new Date()): ContestPhase {
  if (isHalloweenEventActive(now)) return "during";
  return now < EVENT_START ? "before" : "after";
}

/** Seules les captures normales dans le Manoir, pendant la fenêtre, comptent (D4 bis). */
export function isContestCapture(zone: string, now = new Date()): boolean {
  return zone === HALLOWEEN_ZONE_ID && isHalloweenEventActive(now);
}

/** D5 : `random()` est dans [0, 1). Strictement sous le seuil = citrouille. */
export function rollPumpkin(random: () => number = Math.random): boolean {
  return random() < PUMPKIN_DROP_CHANCE;
}

export function getContestProgress(player: Pick<Player, "events">): ContestProgress {
  return player.events?.[HALLOWEEN_CONTEST_EVENT_ID] ?? { captures: {}, pumpkins: 0 };
}

export function computeContestScore(progress: ContestProgress): number {
  let score = (progress.pumpkins ?? 0) * PUMPKIN_POINTS;
  for (const [rarity, count] of Object.entries(progress.captures ?? {})) {
    const points = RARITY_CONTEST_POINTS[rarity as Rarity] ?? UNKNOWN_RARITY_POINTS;
    score += points * (count ?? 0);
  }
  return score;
}

/**
 * Enregistre une capture du concours sur le joueur donné. À appeler DANS le
 * callback d'`updatePlayer` (profil frais, écriture sérialisée par le verrou de
 * players.json) : aucun autre écrivain, donc aucune perte de points.
 */
export function recordContestCapture(player: Player, rarity: string, pumpkinFound: boolean): void {
  player.events ??= {};
  const progress = (player.events[HALLOWEEN_CONTEST_EVENT_ID] ??= { captures: {}, pumpkins: 0 });
  const key = rarity as Rarity;
  progress.captures[key] = (progress.captures[key] ?? 0) + 1;
  if (pumpkinFound) {
    progress.pumpkins += 1;
    player.items ??= {};
    player.items[PUMPKIN_ITEM_ID] = (player.items[PUMPKIN_ITEM_ID] ?? 0) + 1;
  }
}

/** Classement des joueurs ayant au moins 1 point, score décroissant. */
export function rankContest(players: Record<string, Player>): ContestEntry[] {
  const scored = Object.entries(players)
    .map(([userId, player]) => {
      const progress = getContestProgress(player);
      return { userId, name: player.name ?? userId, progress, score: computeContestScore(progress) };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return scored.map((entry) => ({
    ...entry,
    rank: scored.filter((other) => other.score > entry.score).length + 1,
    tied: scored.filter((other) => other.score === entry.score).length > 1,
  }));
}

/** Tous les joueurs au score maximum, seulement s'il est strictement positif. */
export function getContestWinners(players: Record<string, Player>): ContestEntry[] {
  return rankContest(players).filter((entry) => entry.rank === 1);
}

export function formatRank(entry: Pick<ContestEntry, "rank" | "tied">): string {
  const label = entry.rank === 1 ? "1er" : `${entry.rank}e`;
  return entry.tied ? `${label} ex aequo` : label;
}

const MAX_LISTED_WINNERS = 10;
const MAX_LISTED_RUNNERS_UP = 5;

/** Section « résultats » de l'embed de fin. */
export function buildContestEndResults(players: Record<string, Player>): {
  title: string;
  value: string;
} {
  const title = "🏆 Concours de capture";
  const ranking = rankContest(players);
  if (ranking.length === 0) {
    return { title, value: "Personne n'a osé entrer dans le Manoir…" };
  }

  const winners = ranking.filter((entry) => entry.rank === 1);
  const shown = winners.slice(0, MAX_LISTED_WINNERS).map((w) => `<@${w.userId}>`);
  const more = winners.length > shown.length ? ` et ${winners.length - shown.length} autres` : "";
  const lines = [
    `${winners.length > 1 ? "**Vainqueurs ex aequo**" : "**Vainqueur**"} avec **${winners[0].score} points** : ${shown.join(", ")}${more}`,
  ];

  const runnersUp = ranking.filter((entry) => entry.rank > 1 && entry.rank <= 3);
  if (runnersUp.length > 0) {
    lines.push(
      "",
      ...runnersUp
        .slice(0, MAX_LISTED_RUNNERS_UP)
        .map((e) => `${formatRank(e)} : <@${e.userId}> (${e.score} points)`),
    );
  }

  lines.push(
    "",
    "*La récompense, une capture ciblée mythique dans la zone de son choix, sera remise par un admin.*",
  );
  return { title, value: lines.join("\n") };
}
