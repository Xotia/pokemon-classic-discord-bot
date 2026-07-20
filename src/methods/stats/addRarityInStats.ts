const fs = require('fs');
import { statsDb } from '../../config/paths';

export function addRarityInStats(guildId: string, rarity: string): void {
    const stats = JSON.parse(fs.readFileSync(statsDb(guildId), 'utf8'));
    if (rarity) {
        stats.rarity[rarity] = (stats.rarity[rarity] || 0) + 1;
    }
    fs.writeFileSync(statsDb(guildId), JSON.stringify(stats, null, 2));
}