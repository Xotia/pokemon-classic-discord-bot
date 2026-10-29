import { RaidState } from "../../types/raid/RaidState";
import { generateEventRaidState } from "../events/generateEventRaidState";
import { getRegistrationDurationMinutes, rollRaidDifficulty } from "../raid/raidGenerator.service";
import { HALLOWEEN_RAID_POKEMON_ID, HALLOWEEN_ZONE_LABEL } from "./halloweenEventConfig";

/**
 * Raid du jour du 31 octobre : Darkrai à la place du tirage aléatoire. Même
 * difficulté et même durée d'inscription qu'un raid normal du serveur.
 */
export async function generateHalloweenRaidState(guildId: string): Promise<RaidState> {
  const durationMs = getRegistrationDurationMinutes(guildId) * 60 * 1000;
  return generateEventRaidState({
    guildId,
    pokemonId: HALLOWEEN_RAID_POKEMON_ID,
    zoneLabel: HALLOWEEN_ZONE_LABEL,
    difficulty: rollRaidDifficulty(),
    registrationClosesAt: new Date(Date.now() + durationMs),
  });
}
