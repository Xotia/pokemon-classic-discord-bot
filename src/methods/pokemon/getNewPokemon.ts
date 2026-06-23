import { Pokemon } from '../../types/Pokemon';
import { getRandomPokemonFromRarity } from './getRandomPokemonFromRarity';
import { isThisPokemonSameAsLastCapture } from './isThisPokemonSameAsLastCapture';

export async function getNewPokemon(rarity: string, generation: string, zone: string): Promise<Pokemon | null> {

    let randomPokemonFromRarity;

    do {
        randomPokemonFromRarity = getRandomPokemonFromRarity(rarity, generation, zone);
        if (!randomPokemonFromRarity) {
            console.warn(`⚠️ Aucun Pokémon trouvé pour la rareté "${rarity}"`);
            return null;
        }
    } while (await isThisPokemonSameAsLastCapture(randomPokemonFromRarity.id))

    return randomPokemonFromRarity;
}