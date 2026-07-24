export function getPokemonTypes(pokemonTypes: { type: { name: string } } []): string [] {
    let pokemonTypesList: string [] = [];

    pokemonTypes.forEach(element => {
        pokemonTypesList.push(element.type.name);
    });

    return pokemonTypesList;
}