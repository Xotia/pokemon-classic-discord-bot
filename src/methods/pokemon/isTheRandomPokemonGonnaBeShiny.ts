export function isTheRandomPokemonGonnaBeShiny(): boolean {
    const shinyRateNumber = parseFloat(process.env.SHINY_RATE || '256');
    const randomValue = Math.random();
    const isShiny = randomValue < (1 / shinyRateNumber);
    console.log('randomShinyValue = '+randomValue+' | isShiny = '+isShiny);
    return isShiny;
}