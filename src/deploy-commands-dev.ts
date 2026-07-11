import { REST, Routes } from "discord.js";
import "dotenv/config";
import { getLoggerForGuild } from "./utils/logger";
import { commands } from "./commandDefinitions";
import { loadGuildRegistry } from "./config/guilds";

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

const shouldClear = process.argv.includes("--clear");
const body = shouldClear ? [] : commands;

(async () => {
  const guilds = loadGuildRegistry();

  for (const guild of guilds) {
    const logger = getLoggerForGuild(guild.guildId);
    try {
      logger.info(
        shouldClear
          ? `Suppression des commandes guild-scoped sur ${guild.name} (${guild.guildId})...`
          : `Déploiement (dev, guild-scoped) sur ${guild.name} (${guild.guildId})...`,
      );
      await rest.put(
        Routes.applicationGuildCommands(process.env.APPLICATION_ID!, guild.guildId),
        { body },
      );
      logger.info(
        shouldClear
          ? `Commandes guild-scoped supprimées sur ${guild.name} (${guild.guildId}).`
          : `Commandes déployées sur ${guild.name} (${guild.guildId}).`,
      );
    } catch (error) {
      logger.info(`❌ Erreur sur ${guild.name} (${guild.guildId}) : ${error}`);
      console.error(error);
    }
  }
})();
