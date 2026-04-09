import fs from 'node:fs/promises';
import { STATS_DB } from '../../../config/paths';
import logger from '../../../utils/logger';

export async function addRarityInPlayerStats(playerName: string, rarity: string): Promise<void> {
    try {
        const raw = await fs.readFile(STATS_DB, 'utf-8');
        let stats = JSON.parse(raw);

        if (!stats) stats = {};
        if (!stats.rarity) stats.rarity = {};
        if (!stats.rarity[playerName]) stats.rarity[playerName] = {};

        stats.rarity[playerName][rarity] = (stats.rarity[playerName][rarity] || 0) + 1;

        await fs.writeFile(STATS_DB, JSON.stringify(stats, null, 2), 'utf-8');

        logger.info(`✨ ${playerName} → rarity: ${stats.rarity[playerName][rarity]}`);

    } catch (error) {
        console.error('❌ Erreur addRarityInPlayerStats:', (error as Error).message);
        throw error;
    }
}