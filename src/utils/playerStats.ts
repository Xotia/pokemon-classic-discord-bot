import { Player } from '../types/Player'

export function getPlayerRandomTotalCaptures(player: Player): number {
    return Object.values(player.randomCaptures).reduce((sum, stats) => sum + stats.total, 0);
}

export function getPlayerRandomUniquePokemons(player: Player): number {
    return Object.keys(player.randomCaptures).length;
}

export function getPlayerShinyRandomTotal(player: Player): number {
    return Object.values(player.randomCaptures).reduce((sum, stats) => sum + stats.shiny, 0);
}