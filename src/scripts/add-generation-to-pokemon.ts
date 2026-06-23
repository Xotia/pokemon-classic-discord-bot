import { promises as fs } from 'node:fs';
import path from 'node:path';

type PokemonEntry = {
  id: number;
  name: string;
  generation?: number;
  [key: string]: unknown;
};

async function addGenerationToPokemonJson(): Promise<void> {
  const filePath = path.join(process.cwd(), 'data', 'pokemon-list.json');

  const raw = await fs.readFile(filePath, 'utf-8');
  const pokemonList = JSON.parse(raw) as PokemonEntry[];

  if (!Array.isArray(pokemonList)) {
    throw new Error('Le fichier pokemon-list.json ne contient pas un tableau JSON.');
  }

  const updatedPokemonList = pokemonList.map((pokemon, index) => {
    if (index < 151) {
      return {
        ...pokemon,
        generation: 1,
      };
    }

    if (index < 251) {
      return {
        ...pokemon,
        generation: 2,
      };
    }

    return pokemon;
  });

  await fs.writeFile(filePath, JSON.stringify(updatedPokemonList, null, 2) + '\n', 'utf-8');

  console.log(`✅ ${updatedPokemonList.length} Pokémon traités dans ${filePath}`);
  console.log('➡️ Génération 1 appliquée aux index 0 à 150');
  console.log('➡️ Génération 2 appliquée aux index 151 à 250');
}

addGenerationToPokemonJson().catch((error) => {
  console.error('❌ Erreur pendant la mise à jour du fichier pokemon-list.json');
  console.error(error);
  process.exit(1);
});