import { playersDb } from '../config/paths';
import fs from 'fs';
import { Player } from '../types/Player';

export function loadPlayers(guildId: string): Player[] {
    return JSON.parse(fs.readFileSync(playersDb(guildId), 'utf8')) as Player[];
}
