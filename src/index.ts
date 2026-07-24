import "dotenv/config";

import { Client, GatewayIntentBits, Events, Interaction } from "discord.js";

import { pingCommand } from "./commands/pingCommand";
import { cheatCommand } from "./commands/cheatCommand";
import { forceEndRaidCommand } from "./commands/forceEndRaidCommand";
import { pokedexCommand } from "./commands/pokedexCommand";
import logger from "./utils/logger";
import { execute } from "./commands/getStatsCommand";
import { captureCommand } from "./commands/captureCommand";
import { helpCommand } from "./commands/helpCommand";
import { getPity } from "./commands/getPityCommand";
import { getRarityCommand } from "./commands/getRarityCommand";
import { getPokemonInfoCommand } from "./commands/getPokemonInfoCommand";

import { startRaidScheduler } from './features/raid/raidScheduler';

import { raidCommand } from "./commands/raidCommand";
import { loadUnlockedZones } from "./utils/loadUnlockedZones";
import { readPlayers } from "./features/raid/prepareRaidDefenderFromPlayerPokemon";
import { getPokemonCatalog } from "./utils/pokemonCatalog";
import { TYPE_LABELS } from "./config/typeLabels";
import { getRaidInfo } from "./commands/getRaidInfo";
import { playersDb } from "./config/paths";
import { loadGuildRegistry, getGuildConfig, ensureGuildDataFiles } from "./config/guilds";
import { getLoggerForGuild } from "./utils/logger";
import { getShinyRate } from "./config/guildSettings";

type Zone = { id: string; label: string };

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

startRaidScheduler(client);

client.on(Events.Error, (error) => {
  logger.error({ err: error }, "❌ Erreur client Discord non gérée");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "❌ unhandledRejection : promesse rejetée non gérée");
});

process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "❌ uncaughtException : erreur non capturée");
});

// Event ready
client.once(Events.ClientReady, (c: typeof client) => {
  logger.info(`Bot connecté ! Connecté en tant que ${c.user?.tag}`);

  for (const guild of loadGuildRegistry()) {
    ensureGuildDataFiles(guild.guildId);
    getLoggerForGuild(guild.guildId).info(`[GUILDS] Données prêtes pour ${guild.name} (${guild.guildId}).`);
  }
});

client.login(process.env.DISCORD_TOKEN);

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    await handleInteraction(interaction);
  } catch (error) {
    console.error("❌ Erreur non gérée dans interactionCreate:", error);

    if (interaction.guildId) {
      getLoggerForGuild(interaction.guildId).error(
        { err: error },
        "❌ Erreur non gérée dans interactionCreate",
      );
    }

    if (interaction.isRepliable()) {
      try {
        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply("❌ Une erreur est survenue lors du traitement de la commande.");
        } else if (!interaction.deferred && !interaction.replied) {
          await interaction.reply({
            content: "❌ Une erreur est survenue lors du traitement de la commande.",
            ephemeral: true,
          });
        }
      } catch {
        // L'interaction a probablement déjà expiré (ex: DiscordAPIError 10062) : rien à faire de plus.
      }
    }
  }
});

async function handleInteraction(interaction: Interaction) {
  if (!interaction.guildId || !getGuildConfig(interaction.guildId)) return;

  const logger = getLoggerForGuild(interaction.guildId);

  if (interaction.isAutocomplete()) {
    if (interaction.commandName === "raid") {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === "type") {
        try {
          const search = focusedOption.value.toLowerCase();
          const pokemonName = interaction.options.getString("pokemon_name");

          let availableTypes: string[];

          if (pokemonName) {
            const pokemonList = getPokemonCatalog(interaction.guildId);
            const pokemon = pokemonList.find((p) => p.name.toLowerCase() === pokemonName.toLowerCase());
            availableTypes = pokemon ? pokemon.types : Object.keys(TYPE_LABELS);
          } else {
            availableTypes = Object.keys(TYPE_LABELS);
          }

          const suggestions = availableTypes
            .filter((t) => {
              const label = TYPE_LABELS[t] ?? t;
              return label.toLowerCase().includes(search) || t.toLowerCase().includes(search);
            })
            .slice(0, 25)
            .map((t) => ({ name: TYPE_LABELS[t] ?? t, value: t }));

          await interaction.respond(suggestions);
        } catch {
          await interaction.respond([]);
        }
        return;
      }

      if (focusedOption.name === "pokemon_name") {
        try {
          if (!interaction.guildId) {
            await interaction.respond([]);
            return;
          }
          const search = focusedOption.value.trim().toLowerCase();
          const typeOption = interaction.options.data.find(o => o.name === "type");
          const rawType = (typeOption?.value as string | undefined) ?? null;
          const selectedType = rawType
            ? Object.entries(TYPE_LABELS).find(([key, label]) => key === rawType || label === rawType)?.[0] ?? rawType
            : null;
          const players = await readPlayers(playersDb(interaction.guildId));
          const player = players[interaction.user.id];

          if (!player?.captureList) {
            await interaction.respond([]);
            return;
          }

          const seasonPokemonIds = Object.entries(player.captureList)
            .filter(([, stats]) => stats.capturedInCurrentSeason)
            .map(([id]) => Number(id));

          const pokemonList = getPokemonCatalog(interaction.guildId);

          const suggestions = pokemonList
            .filter((p) => seasonPokemonIds.includes(p.id))
            .filter((p) => p.name.toLowerCase().includes(search))
            .filter((p) => !selectedType || p.types.includes(selectedType))
            .slice(0, 25)
            .map((p) => ({ name: p.name, value: p.name }));

          await interaction.respond(suggestions);
        } catch {
          await interaction.respond([]);
        }
      }
      return;
    }

    if (interaction.commandName === "get-pokemon-info") {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === "pokemon") {
        try {
          if (!interaction.guildId) {
            await interaction.respond([]);
            return;
          }
          const search = focusedOption.value.trim().toLowerCase();
          const pokemonList = getPokemonCatalog(interaction.guildId);

          const suggestions = pokemonList
            .filter((p) => p.name.toLowerCase().includes(search))
            .slice(0, 25)
            .map((p) => ({ name: p.name, value: p.name }));

          await interaction.respond(suggestions);
        } catch {
          await interaction.respond([]);
        }
      }
      return;
    }

    if (interaction.commandName === "capture") {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === "zone") {
        if (!interaction.guildId) {
          await interaction.respond([]);
          return;
        }
        const generation = interaction.options.getString("generation");
        const search = focusedOption.value.toLowerCase();
        const unlockedZones = loadUnlockedZones(interaction.guildId);

        const pool: Zone[] =
          generation && generation in unlockedZones
            ? unlockedZones[generation as keyof typeof unlockedZones]
            : Object.values(unlockedZones).flat();

        const suggestions = pool
          .filter(
            (z) =>
              z.label.toLowerCase().includes(search) ||
              z.id.toLowerCase().includes(search),
          )
          .slice(0, 25)
          .map((z) => ({ name: z.label, value: z.id }));

        await interaction.respond(suggestions);
      }
    }

    return;
  }

  if (!interaction.isChatInputCommand() || !interaction.user?.id) {
    console.warn("❌ Interaction invalide:", !!interaction.user?.id);
    return;
  }

  if (!interaction.user) {
    logger.info(`❌ Interaction sans user`);
    console.error("❌ Interaction sans user");
    return;
  }

  if (!interaction.user.globalName) {
    console.warn("⚠️ User sans globalName, utilise username:", {
      id: interaction.user.id,
      username: interaction.user.username,
      hasGlobalName: !!interaction.user.globalName,
    });
  }

  logger.info("======================================================================================================================================");
  logger.info({
    event: "interaction_received",
    message: "➡️ Interaction reçue",
    id: interaction.id,
    type: interaction.type,
    isCommand: interaction.isChatInputCommand(),
    commandName: interaction.commandName,
  });

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    return pingCommand(interaction);
  }

  if (interaction.commandName === "pity") {
    return await getPity(interaction);
  }

  if (interaction.commandName === "get-rarity") {
    return await getRarityCommand(interaction);
  }

  if (interaction.commandName === "cheat") {
    return cheatCommand(interaction);
  }

  if (interaction.commandName === "pokedex") {
    return await pokedexCommand(interaction);
  }

  if (interaction.commandName === "leaderboard") {
    return await execute(interaction);
  }

  if (interaction.commandName === "get-shiny-rate") {
    return interaction.reply(
      "Le taux d'apparition des Pokémon shinys est de 1 chance sur " +
        getShinyRate(interaction.guildId),
    );
  }

  if (interaction.commandName === "capture") {
    return await captureCommand(interaction);
  }

  if (interaction.commandName === "raid") {
    return await raidCommand(interaction);
  }

  if (interaction.commandName === "help") {
    return helpCommand(interaction);
  }

  if (interaction.commandName === "raid-squad") {
    return getRaidInfo(interaction);
  }

  if (interaction.commandName === "raid-force-end") {
    return forceEndRaidCommand(interaction);
  }

  if (interaction.commandName === "get-pokemon-info") {
    return await getPokemonInfoCommand(interaction);
  }
}
