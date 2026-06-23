import logger from "../../utils/logger";

export async function handleNoPokemonFound(
  interaction: any,
  rarity: string,
) {
  logger.info(`😞 Aucun Pokémon ${rarity} disponible`);
  await interaction.editReply(`😞 Aucun Pokémon trouvé`);
}
