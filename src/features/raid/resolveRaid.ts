import { RaidState } from "../../types/raid/RaidState";
import { computeBruteRaidResult, RAID_STAT_MATCHUPS } from "./computeBruteRaidResult";

export function resolveRaid(state: RaidState): RaidState {
  if (!state.raidPokemon) {
    throw new Error("No active raid boss.");
  }

  if (state.defenders.length === 0) {
    return {
      ...state,
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      result: {
        success: false,
        missingStats: ["attack", "specialAttack", "defense", "specialDefense", "speed"],
        participantsCount: 0,
        teamStats: {
          hp: 0,
          attack: 0,
          specialAttack: 0,
          defense: 0,
          specialDefense: 0,
          speed: 0,
        },
        // Équipe vide : chaque écart vaut 0 moins la stat du boss AFFRONTÉE sur
        // cet axe, pas sa stat homonyme.
        statDiffs: {
          hp: -state.raidPokemon.finalStats.hp,
          attack: -state.raidPokemon.finalStats[RAID_STAT_MATCHUPS.attack],
          specialAttack: -state.raidPokemon.finalStats[RAID_STAT_MATCHUPS.specialAttack],
          defense: -state.raidPokemon.finalStats[RAID_STAT_MATCHUPS.defense],
          specialDefense: -state.raidPokemon.finalStats[RAID_STAT_MATCHUPS.specialDefense],
          speed: -state.raidPokemon.finalStats[RAID_STAT_MATCHUPS.speed],
        },
      },
    };
  }

  return {
    ...state,
    status: "resolved",
    resolvedAt: new Date().toISOString(),
    result: computeBruteRaidResult(state),
  };
}