import fs from 'fs';

import { playersDb } from '../../config/paths'

function parseGuildId(argv: string[]): string {
    const index = argv.indexOf('--guildId');
    const guildId = index !== -1 ? argv[index + 1] : undefined;

    if (!guildId) {
        console.error('Usage: ts-node src/scripts/player-maintenance/migrate-players.ts --guildId <id>');
        process.exit(1);
    }

    return guildId;
}

const guildId = parseGuildId(process.argv.slice(2));

const raw = fs.readFileSync(playersDb(guildId), 'utf-8');
const players = JSON.parse(raw);

Object.entries(players).forEach(([userId, player]: [string, any]) => {
    const stats: Record<number, { total: number; shiny: number }> = {};

    player.randomCaptures.forEach((id:number)=> {
        stats[id] = stats [id] || { total: 0, shiny: 0 };
        stats[id].total += 1;
    });

    player.randomCaptures = stats;

});

fs.writeFileSync(playersDb(guildId), JSON.stringify(players, null, 2));

console.log('Migration terminée');