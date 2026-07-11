import { createProfileIfNeeded } from "../methods/player/createProfileIfNeeded";
import { savePlayerDataById } from "../methods/player/savePlayerDataById";
import { addAllStats } from "../methods/stats/addAllStats";
import { getPokemonByName } from "../methods/pokemon/getPokemonByName";
import { getPlayerIdByName } from "../methods/player/getPlayerIdByName";
import { getPlayer } from "../utils/loadPlayer";
import { getLoggerForGuild } from "../utils/logger";
import { buildCapturedPokemonEmbed } from "../methods/embed/buildCapturedPokemonEmbed";
import { isPokemonInPokedex } from "../methods/pokedex/isPokemonInPokedex";

export async function cheatCommand(interaction: any) {
  const callerName = interaction.user.globalName || interaction.user.username;

  const guildId = interaction.guildId;
  if (!guildId) {
    return interaction.reply("Cette commande n'est disponible que sur un serveur.");
  }
  createProfileIfNeeded(interaction, guildId);
  getLoggerForGuild(guildId).info("🏓 Exécution de /cheat pour", callerName);

  const OWNER_ID = process.env.ADMIN_ID;

  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply(`Non ${callerName} tu ne tricheras pas ici.`);
  }

  await interaction.deferReply();

  const playerName = interaction.options.getString("player", true);
  const pokemonName = interaction.options.getString("pokemon", true);
  const isShiny = interaction.options.getBoolean("shiny", true);

  const playerId = getPlayerIdByName(guildId, playerName);

  if (!playerId) {
    await interaction.editReply(`❌ Joueur introuvable : ${playerName}`);
    return;
  }

  const player = getPlayer(guildId, playerId);

  if (!player) {
    await interaction.editReply(
      `❌ Impossible de charger le joueur : ${playerName}`,
    );
    return;
  }

  const pokemon = await getPokemonByName(guildId, pokemonName);

  if (!pokemon) {
    await interaction.editReply(`❌ Pokémon introuvable : ${pokemonName}`);
    return;
  }

  const isInPokedexBeforeCapture = isPokemonInPokedex(
    guildId,
    player,
    pokemon.id,
    playerId,
  );

  player.captureList ??= {};
  player.captureList[String(pokemon.id)] ??= {
    total: 0,
    shiny: 0,
    capturedInCurrentSeason: false,
  };
  player.captureList[String(pokemon.id)].total += 1;

  if (isShiny) {
    player.captureList[String(pokemon.id)].shiny += 1;
  }

  await addAllStats(guildId, pokemon, isShiny, player);
  await savePlayerDataById(guildId, playerId, player);

  const trainerName = player.name;

  const { embed, footer, isInPokedex } = buildCapturedPokemonEmbed({
    guildId,
    player,
    playerId,
    pokemon,
    isShiny,
    trainerName: player.name,
    isAlreadyInPokedex: isInPokedexBeforeCapture,
  });

  getLoggerForGuild(guildId).info(
    `🛠️ Cheat capture: ${player.name} a reçu ${pokemon.name} (id=${pokemon.id})${isShiny ? " shiny" : ""}${!isInPokedexBeforeCapture ? " (Nouveau dans le Pokédex)" : ""}`,
  );

  await interaction.editReply({ embeds: [embed] });
}
