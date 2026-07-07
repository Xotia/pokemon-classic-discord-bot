import { Rarity } from "../../config/rarity";
import logger from "../../utils/logger";
import { pitySystem } from "../pity/pitySystem";
import { resetPityCounterIfNeeded } from "../pity/resetPityCounterIfNeeded";
import { downgradeRarity } from "../rarity/downgradeRarity";
import { getPokemonByRarity } from "../rarity/getPokemonByRarity";
import { rollRarity } from "../rarity/rollRarity";

export async function getNewGatchaPokemon(
  guildId: string,
  player: any,
  generation: string,
  zone: string,
) {
  const pityTime = pitySystem(player);
  let currentRarity = rollRarity(pityTime);

  resetPityCounterIfNeeded(player, currentRarity);

  let result = await getPokemonByRarity(guildId, generation, zone, currentRarity);

  while (!result.pokemonCatched) {
    logger.info(
      `🥦 Aucun Pokémon ${currentRarity} disponible, tentative avec une rareté inférieure.`,
    );
    logger.info(`Downgrading rarity from ${currentRarity}...`);

    if (currentRarity === "common") {
      logger.info(
        `🥦 Aucun Pokémon disponible dans la zone ${zone} pour la rareté ${currentRarity}.`,
      );
      return {
        pokemonCatched: undefined,
        rarity: currentRarity,
      };
    }

    const downgradedRarity = downgradeRarity(currentRarity);

    if (!downgradedRarity) {
      logger.info(
        `🥦 Impossible de descendre sous la rareté ${currentRarity} pour la zone ${zone}.`,
      );
      return {
        pokemonCatched: undefined,
        rarity: currentRarity,
      };
    }

    currentRarity = downgradedRarity;
    result = await getPokemonByRarity(guildId, generation, zone, currentRarity);
  }

  return result;
}