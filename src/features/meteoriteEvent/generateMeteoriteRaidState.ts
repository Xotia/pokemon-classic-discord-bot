import { RaidState } from "../../types/raid/RaidState";
import { getPokemonById } from "../../methods/pokemon/getPokemonById";
import { multiplyStats } from "../raid/raidGenerator.service";
import { METEORITE_ZONE_ID, METEORITE_ZONE_LABEL } from "./meteoriteEventConfig";
import { createEmptyRaidState } from "../raid/createEmptyRaidState";

export async function generateMeteoriteRaidState(
  guildId: string,
  deoxysPokemonId: number,
  difficulty = 5,
): Promise<RaidState> {
  const pokemon = getPokemonById(guildId, deoxysPokemonId);
  if (!pokemon) throw new Error(`Deoxys id ${deoxysPokemonId} not found in catalog`);

  const finalStats = multiplyStats(pokemon.stats, difficulty);

  return {
    ...createEmptyRaidState(),
    status: "registration",
    zone: METEORITE_ZONE_LABEL,
    generation: null,
    raidPokemon: {
      id: pokemon.id,
      name: pokemon.name,
      zone: METEORITE_ZONE_LABEL,
      types: pokemon.types,
      attackType: pokemon.types[0],
      difficulty,
      baseStats: pokemon.stats,
      finalStats,
      defenseEffectiveness: pokemon.effectiveness.defense,
    },
    defenders: [],
    result: null,
    reward: null,
  };
}
