const fs = require('fs');
const fetch = require('node-fetch');
const pokemonGen3List = JSON.parse(fs.readFileSync('../../data/gen3.json'));

const POKEMON_API = 'https://pokeapi.co/api/v2/pokemon';
const SPECIES_API = 'https://pokeapi.co/api/v2/pokemon-species';
const START_ID = 252;
const END_ID = 386;

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

async function fetchPokemon(id) {
  const pokemonRes = await fetch(`${POKEMON_API}/${id}`);
  if (!pokemonRes.ok) throw new Error(`Erreur pokemon ${id}: ${pokemonRes.status}`);
  const pokemon = await pokemonRes.json();

  const speciesRes = await fetch(`${SPECIES_API}/${id}`);
  if (!speciesRes.ok) throw new Error(`Erreur species ${id}: ${speciesRes.status}`);
  const species = await speciesRes.json();

  const frenchNameEntry = species.names.find(
    (n) => n.language && n.language.name === 'fr'
  );
  const frenchName = frenchNameEntry ? frenchNameEntry.name : species.name;

  const showdownName = pokemon.name; // anglais, minuscule
  const baseName = showdownName.toLowerCase().replace("'", "").replace(".", "").replace(" ", "-");
  const image = `https://play.pokemonshowdown.com/sprites/xyani/${baseName}.gif`;
  const shinyImage = `https://play.pokemonshowdown.com/sprites/xyani-shiny/${baseName}.gif`;
  const rarity = getRarity(id);

  return {
    id: pokemon.id,
    name: frenchName,      // ← nom affiché en français
    rarity: rarity,
    image,
    shinyImage,
  };
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
