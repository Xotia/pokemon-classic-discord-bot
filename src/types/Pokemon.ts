export interface Pokemon {
    id: number;
    name: string;
    spawnRate: number;
    catchRateRaw: number;
    image: string;
    shinyImage: string;
}

export type PokemonRecord = Record <number, Pokemon>;