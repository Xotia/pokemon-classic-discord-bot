import { isPokemonInPokedex } from "../pokedex/isPokemonInPokedex";
import { getPokemonSpriteUrl } from "../pokemon/getPokemonSpriteUrl";
import { getEventSprite } from "../../features/halloweenEvent/halloweenSprites";
import { buildTitleForRandomCaptureEmbed } from "./buildTitleForRandomCaptureEmbed";
import { buildDescriptionForPokemonCaptureEmbed } from "./buildDescriptionForRandomCaptureEmbed";
import { defineRarityColor } from "../rarity/defineRarityColor";
import { editFooter } from "./editFooter";
import { buildEmbed } from "./buildEmbed";

export function buildCaptureEmbedPayload(
  interaction: any,
  guildId: string,
  player: any,
  pokemonCatched: any,
  isShiny: boolean,
) {
  const spriteUrl = getEventSprite(pokemonCatched, isShiny) ?? getPokemonSpriteUrl(isShiny, pokemonCatched);
  const isInPokedex = isPokemonInPokedex(
    guildId,
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
    guildId,
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