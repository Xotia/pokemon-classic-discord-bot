import fs from 'fs';

import { PLAYERS_DB } from '../config/paths'

const raw = fs.readFileSync(PLAYERS_DB, 'utf-8');
const players = JSON.parse(raw);

Object.entries(players).forEach(([userId, player]: [string, any]) => {
    const stats: Record<number, { total: number; shiny: number }> = {};

    player.randomCaptures.forEach((id:number)=> {
        stats[id] = stats [id] || { total: 0, shiny: 0 };
        stats[id].total += 1;
    });

    player.randomCaptures = stats;

});

fs.writeFileSync(PLAYERS_DB, JSON.stringify(players, null, 2));

console.log('Migration terminée');