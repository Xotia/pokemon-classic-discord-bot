import { REST, Routes } from "discord.js";
import "dotenv/config";
import logger from "./utils/logger";
import { commands } from "./commandDefinitions";

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    logger.info("Déploiement des commandes...");
    await rest.put(
      Routes.applicationCommands(process.env.APPLICATION_ID!),
      { body: commands },
    );
    logger.info("Commandes déployées.");
  } catch (error) {
    logger.info(`❌ Erreur : ${error}`);
    console.error(error);
  }
})();
