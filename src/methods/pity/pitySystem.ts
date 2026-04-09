import logger from "../../utils/logger";

export function pitySystem(player: any): boolean {
    if (player.pityCounter === undefined) {
        player.pityCounter = 0;
        logger.info(`Initialisation du compteur de pity pour le joueur ${player.name}`);
        return false;
    }

    logger.info(`Compteur de pity actuel pour le joueur ${player.name} : ${player.pityCounter}/${process.env.PITY_THRESHOLD}`);

    if (player.pityCounter >= parseInt(process.env.PITY_THRESHOLD || '10')) {
        player.pityCounter = 0;
        logger.info(`Pity time activé pour le joueur ${player.name} après ${process.env.PITY_THRESHOLD} captures sans rareté boostée ou ultra rare.`);
        return true;
    } else {
        player.pityCounter++;
        logger.info(`Compteur de pity pour le joueur ${player.name} : ${player.pityCounter}/${process.env.PITY_THRESHOLD}`);
        return false;
    }
}