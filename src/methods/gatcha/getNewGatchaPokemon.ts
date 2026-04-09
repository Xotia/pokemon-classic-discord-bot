import { pitySystem } from "../pity/pitySystem";
import { resetPityCounterIfNeeded } from "../pity/resetPityCounterIfNeeded";
import { getNewPokemon } from "../pokemon/getNewPokemon";
import { rollRarity } from "../rarity/rollRarity";

export async function getNewGatchaPokemon(player: any) {
    const pityTime = pitySystem(player);
    const rarity = rollRarity(pityTime);
    resetPityCounterIfNeeded(player, rarity);
    const pokemonCatched = await getNewPokemon(rarity);

    return {
        pokemonCatched,
        rarity,
    };
}