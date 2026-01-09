import pokemonGen1 from '../../../data/pokemon-gen1.json';

export function getPokemonName(pokemonId: number): string | null {
    const pokemon = pokemonGen1.find(p => p.id === pokemonId);
    if (pokemon) {
        console.log(`Pokémon trouvé: ID ${pokemonId}, Nom ${pokemon.name}`);
        return pokemon.name;
    } else {
        console.log(`Aucun Pokémon trouvé avec l'ID ${pokemonId}`);
        return null;
    }
}