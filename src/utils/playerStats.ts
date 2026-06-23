import { Player } from '../types/Player'

export function getPlayerTotalCaptures(player: Player): number {
    return Object.values(player.captureList ?? {}).reduce((sum, stats) => sum + stats.total, 0);
}

export function getPlayerUniquePokemons(player: Player): number {
    return Object.keys(player.captureList ?? {}).length;
}

export function getPlayerShinyTotal(player: Player): number {
    return Object.values(player.captureList ?? {}).reduce((sum, stats) => sum + stats.shiny, 0);
}