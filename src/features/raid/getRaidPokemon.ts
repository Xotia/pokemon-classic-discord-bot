import { Rarity } from "../../config/rarity";
import { Pokemon } from "../../types/Pokemon";
import logger from "../../utils/logger";
import type { RarityData } from "../../config/rarity";
import { downgradeRarity } from "../../methods/rarity/downgradeRarity";
import { rollRarityFromList } from "./rollRaidRarity";

type RaidPokemonResult = {
  pokemon: Pokemon;
  rolledRarity: Rarity;
  finalRarity: Rarity;
};

export function getRaidPokemon(
  pokemonList: Pokemon[],
  generation: number,
  zone: string,
  rarityConfig: RarityData[],
): RaidPokemonResult {
  const rolledRarity = rollRarityFromList(rarityConfig);
  let currentRarity: Rarity | null = rolledRarity;
  let safety = 0;

  while (currentRarity) {
    safety++;
    if (safety > 20) {
      throw new Error(
        `Boucle infinie suspectée dans getRaidPokemon | rolledRarity=${rolledRarity}`,
      );
    }
    const candidates = pokemonList.filter((pokemon) => {
      return (
        pokemon.generation === generation &&
        pokemon.rarity === currentRarity &&
        Array.isArray(pokemon.zones) &&
        pokemon.zones.includes(zone)
      );
    });

    logger.info(
      {
        generation,
        zone,
        testedRarity: currentRarity,
        candidateCount: candidates.length,
      },
      "[RAID] Vérification des candidats",
    );

    if (candidates.length > 0) {
      const selectedPokemon =
        candidates[Math.floor(Math.random() * candidates.length)];

      logger.info(
        {
          generation,
          zone,
          rolledRarity,
          finalRarity: currentRarity,
          pokemonId: selectedPokemon.id,
          pokemonName: selectedPokemon.name,
          candidateCount: candidates.length,
        },
        "[RAID] Pokémon sélectionné pour le raid",
      );

      return {
        pokemon: selectedPokemon,
        rolledRarity,
        finalRarity: currentRarity,
      };
    }

    currentRarity = downgradeRarity(currentRarity);
  }

  throw new Error(
    `[RAID_GENERATION_ERROR] Aucun Pokémon disponible | generation=${generation} | zone=${zone} | rolledRarity=${rolledRarity}`,
  );
}
