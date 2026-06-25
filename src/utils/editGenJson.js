const fs = require('fs');
const pokemons = JSON.parse(fs.readFileSync('../../data/pokemon-gen1.json', 'utf8'));
const pokemonRarityList = JSON.parse(fs.readFileSync('../../data/gen1.json', 'utf8'));

function getRarity(id){
    console.log("Affichage de la rareté de " + pokemonRarityList[id-1].name);
    return pokemonRarityList[id-1].rarity;
}

pokemons.forEach(pokemon => {
  // Supprimer attributs
  delete pokemon.spawnRate;
  delete pokemon.catchRateRaw;
  
  // Ajouter rarity
  pokemon.rarity = getRarity(pokemon.id);
});

fs.writeFileSync('../../data/new_gen_1.json', JSON.stringify(pokemons, null, 2));