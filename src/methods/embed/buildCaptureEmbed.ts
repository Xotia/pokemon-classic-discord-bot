import { isPokemonInPokedex } from "../pokedex/isPokemonInPokedex";
import { getPokemonSpriteUrl } from "../pokemon/getPokemonSpriteUrl";
import { buildTitleForRandomCaptureEmbed } from "./buildTitleForRandomCaptureEmbed";
import { buildDescriptionForPokemonCaptureEmbed } from "./buildDescriptionForRandomCaptureEmbed";
import { defineRarityColor } from "../rarity/defineRarityColor";
import { editFooter } from "./editFooter";
import { buildEmbed } from "./buildEmbed";

export function buildCaptureEmbedPayload(
  interaction: any,
  player: any,
  pokemonCatched: any,
  isShiny: boolean,
) {
  const spriteUrl = getPokemonSpriteUrl(isShiny, pokemonCatched);
  const isInPokedex = isPokemonInPokedex(
    player,
    pokemonCatched.id,
    interaction.user.id,
  );

  const trainerName = player.name;
  const color = defineRarityColor(pokemonCatched.rarity, isShiny);
  const title = buildTitleForRandomCaptureEmbed(
    isShiny,
    pokemonCatched,
    color,
  );

  const description = buildDescriptionForPokemonCaptureEmbed({
    pokemon: pokemonCatched,
    isShiny,
    isNewPokemon: !isInPokedex,
    trainerName,
  });

  const footer = editFooter({
    pokemonName: pokemonCatched.name,
    isInPokedex,
    trainerName,
  });

  const embed = buildEmbed(
    title,
    spriteUrl,
    color.color,
    description,
    footer,
  );

  return {
    spriteUrl,
    isInPokedex,
    color,
    title,
    description,
    footer,
    embed,
  };
}