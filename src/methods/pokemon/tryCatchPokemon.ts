import { getLoggerForGuild } from "../../utils/logger";
import { getNewGatchaPokemon } from "../gatcha/getNewGatchaPokemon";

export async function tryCatchPokemon(
  guildId: string,
  player: any,
  generation: string,
  zone: string,
) {
  getLoggerForGuild(guildId).info(
    `Tentative de capture dans la zone ${zone} de la génération ${generation}...`,
  );

  return getNewGatchaPokemon(guildId, player, generation, zone);
}
