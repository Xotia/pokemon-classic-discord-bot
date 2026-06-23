import "dotenv/config";

import { Client, GatewayIntentBits, Events } from "discord.js";

import { pingCommand } from "./commands/pingCommand";
import { cheatCommand } from "./commands/cheatCommand";
import { pokedexCommand } from "./commands/pokedexCommand";
import logger from "./utils/logger";
import { execute } from "./commands/getStatsCommand";
import { captureCommand } from "./commands/captureCommand";
import { helpCommand } from "./commands/helpCommand";
import { getPity } from "./commands/getPityCommand";
import { getRarityCommand } from "./commands/getRarityCommand";

import { startRaidScheduler } from './features/raid/raidScheduler.js';

import { raidCommand } from "./commands/raidCommand";
import { loadUnlockedZones } from "./utils/loadUnlockedZones";

type Zone = { id: string; label: string };

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

startRaidScheduler(client);

// Event ready
client.once(Events.ClientReady, (c: typeof client) => {
  logger.info(`Bot connecté ! Connecté en tant que ${c.user?.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    if (interaction.commandName === "capture") {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === "zone") {
        const generation = interaction.options.getString("generation");
        const search = focusedOption.value.toLowerCase();
        const unlockedZones = loadUnlockedZones();

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

  if (interaction.commandName === "stats") {
    return await execute(interaction);
  }

  if (interaction.commandName === "get-shiny-rate") {
    return interaction.reply(
      "Le taux d'apparition des Pokémon shinys est de 1 chance sur " +
        process.env.SHINY_RATE,
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
});
