import { ChatInputCommandInteraction } from "discord.js";
import { getPokemonByName } from "../methods/pokemon/getPokemonByName";
import { prepareRaidDefenderFromPlayerPokemon } from "../features/raid/prepareRaidDefenderFromPlayerPokemon";
import { registerRaidDefender } from "../features/raid/RegisterRaidDefender";
import { buildEmbed } from "../methods/embed/buildEmbed";
import { createProfileIfNeeded } from "../methods/player/createProfileIfNeeded";
import { getTypeLabel } from "../config/typeLabels";

export async function raidCommand(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply();
  } catch {
    return;
  }
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply("Cette commande n'est disponible que sur un serveur.");
    return;
  }
  createProfileIfNeeded(interaction, guildId);
  const userName = interaction.user.username || interaction.user.tag;

  const pokemonName = interaction.options.getString("pokemon_name", true);
  const attackTypeOption = interaction.options.getString("type") ?? undefined;

  const pokemon = await getPokemonByName(pokemonName);

  if (!pokemon) {
    await interaction.editReply(`Le Pokémon "${pokemonName}" n'existe pas.`);
    return;
  }

  try {
    const prepared = await prepareRaidDefenderFromPlayerPokemon(
      guildId,
      interaction.user.id,
      pokemon.id,
      attackTypeOption,
    );

    await registerRaidDefender(guildId, prepared);

    const confirmationEmbed = buildEmbed(
      "Inscription au raid confirmée",
      "",
      0x2ecc71,
      `Inscription à la défense du raid de **${pokemon.name}** (type d'attaque : **${getTypeLabel(prepared.attackType)}**).`,
      `Joueur : ${userName}`,
    );

    await interaction.editReply({
      content: "",
      embeds: [confirmationEmbed],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    if (
      message.includes("Player not found") ||
      message.includes("RAID_PLAYER_NOT_FOUND")
    ) {
      await interaction.editReply("Ton profil joueur est introuvable.");
      return;
    }

    if (
      message.includes("does not own") ||
      message.includes("RAID_POKEMON_NOT_OWNED")
    ) {
      await interaction.editReply(`Tu ne possèdes pas ${pokemon.name}.`);
      return;
    }

    if (
      message.includes("was not captured in current season") ||
      message.includes("RAID_POKEMON_NOT_CAPTURED_IN_CURRENT_SEASON") ||
      message.includes("RAID_POKEMON_NOT_CAPTURED_THIS_SEASON")
    ) {
      await interaction.editReply(
        `${pokemon.name} doit avoir été capturé pendant la saison en cours.`,
      );
      return;
    }

    if (
      message.includes(`Le type d'attaque`) ||
      message.includes("RAID_INVALID_ATTACK_TYPE")
    ) {
      await interaction.editReply(
        `Le type choisi n'est pas valide pour ${pokemon.name}.`,
      );
      return;
    }

    if (
      message.includes("Pokemon data not found") ||
      message.includes("RAID_POKEMON_DATA_NOT_FOUND")
    ) {
      await interaction.editReply(
        `Les données de ${pokemon.name} sont introuvables.`,
      );
      return;
    }

    if (
      message.includes("Aucun raid n'est actuellement ouvert aux inscriptions.") ||
      message.includes("La période d'inscription au raid est terminée.")
    ) {
      await interaction.editReply(
        "Aucun raid n'est actuellement ouvert aux inscriptions.",
      );
      return;
    }

    throw error;
  }
}
