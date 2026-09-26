import { Rarity } from "../../config/rarity";
import { getLoggerForGuild } from "../../utils/logger";
import { getDayKey, isDailyBoostAvailable } from "../dailyBoost/dailyBoost";
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
  const logger = getLoggerForGuild(guildId);

  // Première capture du jour : tirage boosté comme la pity. Le compteur de pity
  // n'avance pas sur ce tirage, pour ne pas gaspiller une pity qui tomberait en même temps.
  const now = new Date();
  const dailyBoost = isDailyBoostAvailable(player, now);
  const dailyBoostDay = dailyBoost ? getDayKey(now) : undefined;
  if (dailyBoost) {
    logger.info(`Boost quotidien activé pour le joueur ${player.name} (${dailyBoostDay}).`);
  }

  const pityTime = dailyBoost ? false : pitySystem(guildId, player);
  let currentRarity = rollRarity(guildId, dailyBoost || pityTime);

  resetPityCounterIfNeeded(guildId, player, currentRarity);

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
        dailyBoostDay,
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
        dailyBoostDay,
      };
    }

    currentRarity = downgradedRarity;
    result = await getPokemonByRarity(guildId, generation, zone, currentRarity);
  }

  return { ...result, dailyBoostDay };
}
