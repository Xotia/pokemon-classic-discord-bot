import { makeSpriteUrl } from "./makeSpriteUrl";
import { getRarity } from "./getRarity";
import { getPokemonTypes } from "./getPokemonTypes";
import getMultipliers from "./getMultipliers";
import { getPokemonStats } from "./getPokemonStats";

export function buildPokemonJson(pokemon: any, species: any, id: number) {
  const frenchNameEntry = species.names.find(
    (n: any) => n.language && n.language.name === "fr",
  );
  const frenchName = frenchNameEntry ? frenchNameEntry.name : species.name;

  const showdownName = pokemon.name;
  const { image, shinyImage } = makeSpriteUrl(showdownName);
  const rarity = getRarity(id);
  const types = getPokemonTypes(pokemon.types);
  const effectiveness = getMultipliers(types);
  const stats = getPokemonStats(pokemon.stats);

  return {
    id: pokemon.id,
    name: frenchName,
    rarity: rarity,
    image,
    shinyImage,
    originalName: showdownName,
    types,
    effectiveness,
    stats,
  };
}
