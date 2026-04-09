const fs = require('fs');
import { STATS_DB } from '../../config/paths';

export function addRarityInStats(rarity: string): void {
    const stats = JSON.parse(fs.readFileSync(STATS_DB, 'utf8'));
    if (rarity) {
        stats.rarity[rarity] = (stats.rarity[rarity] || 0) + 1;
    }
    fs.writeFileSync(STATS_DB, JSON.stringify(stats, null, 2));
} 