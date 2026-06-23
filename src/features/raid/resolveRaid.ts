import { RaidState } from "../../types/raid/RaidState";
import { computeBruteRaidResult } from "./computeBruteRaidResult";

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
        statDiffs: {
          hp: -state.raidPokemon.finalStats.hp,
          attack: -state.raidPokemon.finalStats.attack,
          specialAttack: -state.raidPokemon.finalStats.specialAttack,
          defense: -state.raidPokemon.finalStats.defense,
          specialDefense: -state.raidPokemon.finalStats.specialDefense,
          speed: -state.raidPokemon.finalStats.speed,
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