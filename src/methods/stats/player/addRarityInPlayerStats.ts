import fs from 'node:fs/promises';
import { statsDb } from '../../../config/paths';
import logger from '../../../utils/logger';

export async function addRarityInPlayerStats(guildId: string, playerName: string, rarity: string): Promise<void> {
    try {
        const raw = await fs.readFile(statsDb(guildId), 'utf-8');
        let stats = JSON.parse(raw);

        if (!stats) stats = {};
        if (!stats.rarityByPlayer) stats.rarityByPlayer = {};
        if (!stats.rarityByPlayer[playerName]) stats.rarityByPlayer[playerName] = {};

        stats.rarityByPlayer[playerName][rarity] = (stats.rarityByPlayer[playerName][rarity] || 0) + 1;

        await fs.writeFile(statsDb(guildId), JSON.stringify(stats, null, 2), 'utf-8');

        logger.info(`✨ ${playerName} → rarity: ${stats.rarityByPlayer[playerName][rarity]}`);

    } catch (error) {
        console.error('❌ Erreur addRarityInPlayerStats:', (error as Error).message);
        throw error;
    }
}