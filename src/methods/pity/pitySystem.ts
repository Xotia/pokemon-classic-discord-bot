import { getLoggerForGuild } from "../../utils/logger";
import { getPityThreshold } from "../../config/guildSettings";

export function pitySystem(guildId: string, player: any): boolean {
    const logger = getLoggerForGuild(guildId);
    const pityThreshold = getPityThreshold(guildId);

    if (player.pityCounter === undefined) {
        player.pityCounter = 0;
        logger.info(`Initialisation du compteur de pity pour le joueur ${player.name}`);
        return false;
    }

    logger.info(`Compteur de pity actuel pour le joueur ${player.name} : ${player.pityCounter}/${pityThreshold}`);

    if (player.pityCounter >= pityThreshold) {
        player.pityCounter = 0;
        logger.info(`Pity time activé pour le joueur ${player.name} après ${pityThreshold} captures sans rareté boostée ou ultra rare.`);
        return true;
    } else {
        player.pityCounter++;
        logger.info(`Compteur de pity pour le joueur ${player.name} : ${player.pityCounter}/${pityThreshold}`);
        return false;
    }
}