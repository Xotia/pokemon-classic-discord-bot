import { RaidDefender } from "../../types/raid/RaidDefender";
import { loadRaidState, saveRaidState } from "./raidState.service";
import { RaidState } from "../../types/raid/RaidState";
import { RegisterRaidDefenderParams } from "../../types/raid/RegisterRaidDefenderParams";

function nowIso(): string {
  return new Date().toISOString();
}

function assertRaidIsOpenForRegistration(state: RaidState): void {
  if (state.status !== "registration") {
    throw new Error("Aucun raid n'est actuellement ouvert aux inscriptions.");
  }

  if (!state.raidPokemon) {
    throw new Error("Le raid courant est invalide : Pokémon de raid manquant.");
  }

  if (!state.registrationClosesAt) {
    throw new Error(
      "Le raid courant est invalide : date de fin d'inscription manquante.",
    );
  }

  const closesAt = new Date(state.registrationClosesAt).getTime();
  const now = Date.now();

  if (now > closesAt) {
    throw new Error("La période d'inscription au raid est terminée.");
  }
}

function buildRaidDefender(params: RegisterRaidDefenderParams): RaidDefender {
  return {
    userId: params.userId,
    pokemonId: params.pokemonId,
    pokemonName: params.pokemonName,
    attackType: params.attackType,
    registeredAt: nowIso(),
    snapshot: {
      types: params.snapshot.types,
      defenseEffectiveness: params.snapshot.defenseEffectiveness,
      stats: params.snapshot.stats,
    },
  };
}

export async function registerRaidDefender(
  params: RegisterRaidDefenderParams,
): Promise<RaidState> {
  const raidState = await loadRaidState();

  assertRaidIsOpenForRegistration(raidState);

  const defender = buildRaidDefender(params);

  const defendersWithoutUser = raidState.defenders.filter(
    (existingDefender) => existingDefender.userId !== params.userId,
  );

  const updatedState: RaidState = {
    ...raidState,
    defenders: [...defendersWithoutUser, defender],
  };

  await saveRaidState(updatedState);

  return updatedState;
}
