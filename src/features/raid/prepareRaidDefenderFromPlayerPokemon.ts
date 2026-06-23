import { PlayersRecord } from "../../types/Player";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Pokemon } from "../../types/Pokemon";
import { getRandomPokemonType } from "../../methods/pokemon/getRandomPokemonType";
import { RegisterRaidDefenderParams } from "../../types/raid/RegisterRaidDefenderParams";

export async function readPlayers(
  playersFilePath: string,
): Promise<PlayersRecord> {
  const raw = await fs.readFile(playersFilePath, "utf8");
  return JSON.parse(raw) as PlayersRecord;
}

export async function readPokemonList(
  pokemonListFilePath: string,
): Promise<Pokemon[]> {
  const raw = await fs.readFile(pokemonListFilePath, "utf8");
  return JSON.parse(raw) as Pokemon[];
}

/**
 * Prépare un RegisterRaidDefenderParams à partir du Pokédex du joueur.
 */
export async function prepareRaidDefenderFromPlayerPokemon(
  discordUserId: string,
  pokemonId: number,
  attackTypeOverride?: string,
  playersFilePath = path.resolve("data/players.json"),
  pokemonListFilePath = path.resolve("data/pokemon-list.json"),
): Promise<RegisterRaidDefenderParams> {
  const players = await readPlayers(playersFilePath);
  const player = players[discordUserId];

  if (!player) {
    throw new Error("RAID_PLAYER_NOT_FOUND");
  }

  const captureStats = player.captureList?.[String(pokemonId)];

  if (!captureStats) {
    throw new Error("RAID_POKEMON_NOT_OWNED");
  }

  if (captureStats.capturedInCurrentSeason !== true) {
    throw new Error("RAID_POKEMON_NOT_CAPTURED_THIS_SEASON");
  }

  const pokemonList = await readPokemonList(pokemonListFilePath);
  const pokemon = pokemonList.find((p) => p.id === pokemonId);

  if (!pokemon) {
    throw new Error("RAID_POKEMON_DATA_NOT_FOUND");
  }

  const availableAttackTypes = pokemon.types;
  let attackType = attackTypeOverride;

  if (attackType && !availableAttackTypes.includes(attackType)) {
    throw new Error("RAID_INVALID_ATTACK_TYPE");
  }

  if (!attackType) {
    const randomType = getRandomPokemonType(pokemon);
    attackType = randomType || pokemon.types[0];
  }

  return {
    userId: discordUserId,
    pokemonId: pokemon.id,
    pokemonName: pokemon.name,
    attackType,
    snapshot: {
      types: pokemon.types,
      defenseEffectiveness: pokemon.effectiveness.defense as Record<string, number>,
      stats: pokemon.stats,
    },
  };
}