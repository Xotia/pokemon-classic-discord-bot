import fs from 'fs';

export function savePlayerData(playerDataPath: string, playerData: Record<string, { name: string; randomCaptures: number[] }>) {
    fs.writeFileSync(playerDataPath, JSON.stringify(playerData, null, 2), 'utf-8');
}