export function displayShinyInLogs(isShiny: boolean, random: { id: number; name: string; spawnRate: number; catchRateRaw: number; image: string; shinyImage: string; }) {
    if (!isShiny) {
        console.log(random.name + " n'est pas shiny.");
    } else {
        console.log(random.name + " est shiny.");
    }
}