import { Pokemon } from '../../types/Pokemon';
import { getRandomPokemonFromRarity } from './getRandomPokemonFromRarity';
import { isThisPokemonSameAsLastCapture } from './isThisPokemonSameAsLastCapture';

export async function getNewPokemon(rarity: string, generation: string, zone: string): Promise<Pokemon | null> {
    const MAX_ATTEMPTS = 10;
    let randomPokemonFromRarity;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        randomPokemonFromRarity = getRandomPokemonFromRarity(rarity, generation, zone);
        if (!randomPokemonFromRarity) {
            console.warn(`⚠️ Aucun Pokémon trouvé pour la rareté "${rarity}"`);
            return null;
        }
        if (!(await isThisPokemonSameAsLastCapture(randomPokemonFromRarity.id))) {
            return randomPokemonFromRarity;
        }
    }

    return randomPokemonFromRarity!;
}