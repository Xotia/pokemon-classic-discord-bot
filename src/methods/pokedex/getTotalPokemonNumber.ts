import { getPokemonCatalog } from "../../utils/pokemonCatalog";

export function getTotalPokemonNumber(guildId: string): number {
    try {
        return getPokemonCatalog(guildId).length;
    } catch (error) {
        throw new Error(`getTotalPokemonNumber échoué: ${(error as Error).message}`);
    }
}
