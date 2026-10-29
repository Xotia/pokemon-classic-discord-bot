import { RaidState } from "../../types/raid/RaidState";
import { generateEventRaidState } from "../events/generateEventRaidState";
import { METEORITE_ZONE_LABEL } from "./meteoriteEventConfig";

export async function generateMeteoriteRaidState(
  guildId: string,
  deoxysPokemonId: number,
  difficulty = 5,
  registrationClosesAt?: Date,
): Promise<RaidState> {
  // Les inscriptions restent ouvertes jusqu'à la clôture du créneau, contrairement
  // aux raids normaux qui utilisent une durée fixe.
  return generateEventRaidState({
    guildId,
    pokemonId: deoxysPokemonId,
    zoneLabel: METEORITE_ZONE_LABEL,
    difficulty,
    registrationClosesAt,
  });
}
