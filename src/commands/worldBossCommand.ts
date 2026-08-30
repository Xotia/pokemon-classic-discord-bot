import { ChatInputCommandInteraction } from "discord.js";
import { getPokemonByName } from "../methods/pokemon/getPokemonByName";
import { prepareWorldBossDefender } from "../features/worldBoss/prepareWorldBossDefender";
import { registerWorldBossDefender } from "../features/worldBoss/registerWorldBossDefender";
import { buildEmbed } from "../methods/embed/buildEmbed";
import { createProfileIfNeeded } from "../methods/player/createProfileIfNeeded";
import { getTypeLabel } from "../config/typeLabels";

/**
 * Pseudo à figer dans l'équipe mondiale. Il est lu ici, à l'inscription, parce
 * qu'un membre d'un autre serveur ne sera plus résoluble au moment d'afficher
 * l'équipe ou le résultat.
 */
function resolveDisplayName(interaction: ChatInputCommandInteraction): string {
  const member = interaction.member;

  if (member && "displayName" in member && typeof member.displayName === "string") {
    return member.displayName;
  }

  return interaction.user.globalName ?? interaction.user.username;
}

export async function worldBossCommand(interaction: ChatInputCommandInteraction) {
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

  const pokemonName = interaction.options.getString("pokemon_name", true);
  const attackTypeOption = interaction.options.getString("type") ?? undefined;

  const pokemon = await getPokemonByName(guildId, pokemonName);

  if (!pokemon) {
    await interaction.editReply(`Le Pokémon "${pokemonName}" n'existe pas.`);
    return;
  }

  try {
    const prepared = await prepareWorldBossDefender({
      guildId,
      userId: interaction.user.id,
      displayName: resolveDisplayName(interaction),
      guildName: interaction.guild?.name,
      pokemonId: pokemon.id,
      attackTypeOverride: attackTypeOption,
    });

    const state = await registerWorldBossDefender(prepared);

    const confirmationEmbed = buildEmbed(
      "Inscription au world boss confirmée",
      "",
      0x9b59b6,
      [
        `Tu franchis le portail avec **${pokemon.name}** (type d'attaque : **${getTypeLabel(prepared.attackType)}**) pour affronter **${state.boss?.name}**.`,
        "",
        `Équipe mondiale : **${state.defenders.length}** défenseur(s), tous serveurs confondus.`,
      ].join("\n"),
      `Joueur : ${prepared.displayName} — ${prepared.guildName}`,
    );

    await interaction.editReply({ content: "", embeds: [confirmationEmbed] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    if (message.includes("RAID_PLAYER_NOT_FOUND")) {
      await interaction.editReply("Ton profil joueur est introuvable sur ce serveur.");
      return;
    }

    if (message.includes("RAID_POKEMON_NOT_OWNED")) {
      await interaction.editReply(`Tu ne possèdes pas ${pokemon.name} sur ce serveur.`);
      return;
    }

    if (message.includes("RAID_POKEMON_NOT_CAPTURED_THIS_SEASON")) {
      await interaction.editReply(
        `${pokemon.name} doit avoir été capturé pendant la saison en cours.`,
      );
      return;
    }

    if (message.includes("RAID_INVALID_ATTACK_TYPE")) {
      await interaction.editReply(`Le type choisi n'est pas valide pour ${pokemon.name}.`);
      return;
    }

    if (message.includes("RAID_POKEMON_DATA_NOT_FOUND")) {
      await interaction.editReply(`Les données de ${pokemon.name} sont introuvables.`);
      return;
    }

    if (message.includes("WORLD_BOSS_NOT_OPEN") || message.includes("WORLD_BOSS_STATE_INVALID")) {
      await interaction.editReply(
        "Aucun portail n'est ouvert pour le moment. Le prochain world boss apparaît dimanche à 12h00.",
      );
      return;
    }

    if (message.includes("WORLD_BOSS_REGISTRATION_CLOSED")) {
      await interaction.editReply(
        "Les inscriptions au world boss sont closes : le combat se résout à 20h00.",
      );
      return;
    }

    throw error;
  }
}
