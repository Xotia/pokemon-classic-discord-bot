const fs = require('fs');
const fetch = require('node-fetch');
const pokemonGen2List = JSON.parse(fs.readFileSync('../../data/gen2.json'));

const POKEMON_API = 'https://pokeapi.co/api/v2/pokemon';
const SPECIES_API = 'https://pokeapi.co/api/v2/pokemon-species';
const START_ID = 152;
const END_ID = 251;

function makeSpriteUrl(name) {
    const baseName = name.toLowerCase().replace("'", "").replace(".", "").replace(" ", "-");
    return {
        image: `https://play.pokemonshowdown.com/sprites/xyani/${baseName}.gif`,
        shinyImage: `https://play.pokemonshowdown.com/sprites/xyani-shiny/${baseName}.gif`
    };
}

function getRarity(id){
    return pokemonGen2List[id-1-151].rarity;
}

async function main() {
    const pokemons = [];

    for (let id = START_ID; id <= END_ID; id++) {
        console.log(`Fetching Pokémon ${id}...`);
        try {
            const p = await fetchPokemon(id);
            pokemons.push(p);
        } catch (err) {
            console.error(err);
        }
        await new Promise(r => setTimeout(r, 200));
    }

    fs.mkdirSync('data', { recursive: true });
    fs.writeFileSync('data/pokemon-gen2.json', JSON.stringify(pokemons, null, 2), 'utf8');
    console.log('Fichier data/pokemon-gen2.json généré.');
}

main().catch(console.error);
