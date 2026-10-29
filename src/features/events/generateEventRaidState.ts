import { RaidState } from "../../types/raid/RaidState";
import { getPokemonById } from "../../methods/pokemon/getPokemonById";
import { multiplyStats } from "../raid/raidGenerator.service";
import { createEmptyRaidState } from "../raid/createEmptyRaidState";

export interface EventRaidOptions {
  guildId: string;
  pokemonId: number;
  /** Libellé de zone affiché (annonce, résultat). Sans génération : aucun déblocage de zone. */
  zoneLabel: string;
  difficulty: number;
  /** Fin des inscriptions. Défaut : 2h après l'ouverture. */
  registrationClosesAt?: Date;
}

/**
 * Raid d'évènement : le Pokémon est imposé et la zone n'appartient à aucune
 * génération (generation: null, donc rien à débloquer à la victoire).
 *
 * Les champs de fenêtre d'inscription sont obligatoires : sans eux,
 * assertRaidIsOpenForRegistration rejette les inscriptions.
 */
export async function generateEventRaidState(options: EventRaidOptions): Promise<RaidState> {
  const { guildId, pokemonId, zoneLabel, difficulty } = options;
  const pokemon = getPokemonById(guildId, pokemonId);
  if (!pokemon) throw new Error(`Pokémon d'évènement id ${pokemonId} introuvable dans le catalogue`);

  const finalStats = multiplyStats(pokemon.stats, difficulty);

  const createdAt = new Date().toISOString();
  const closesAt = options.registrationClosesAt ?? new Date(Date.now() + 2 * 60 * 60 * 1000);

  return {
    ...createEmptyRaidState(),
    raidId: `raid-${Date.now()}`,
    status: "registration",
    createdAt,
    registrationOpensAt: createdAt,
    registrationClosesAt: closesAt.toISOString(),
    zone: zoneLabel,
    generation: null,
    raidPokemon: {
      id: pokemon.id,
      name: pokemon.name,
      zone: zoneLabel,
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
