import { getPokemonSpriteUrl } from "../pokemon/getPokemonSpriteUrl";
import { isPokemonInPokedex } from "../pokedex/isPokemonInPokedex";
import { defineRarityColor } from "../rarity/defineRarityColor";
import { buildTitleForRandomCaptureEmbed } from "./buildTitleForRandomCaptureEmbed";
import { buildDescriptionForPokemonCaptureEmbed } from "./buildDescriptionForRandomCaptureEmbed";
import { editFooter } from "./editFooter";
import { buildEmbed } from "./buildEmbed";
import { BuildCapturedPokemonEmbedParams } from "../../types/Params";

export function buildCapturedPokemonEmbed({
  player,
  playerId,
  pokemon,
  isShiny,
  trainerName,
  gainedXp,
  leveledUp = false,
  newLevel,
  isAlreadyInPokedex,
  zone,
}: BuildCapturedPokemonEmbedParams) {
  const spriteUrl = getPokemonSpriteUrl(isShiny, pokemon);
  const isInPokedex = isAlreadyInPokedex ?? isPokemonInPokedex(player, pokemon.id, playerId);

  const color = defineRarityColor(pokemon.rarity, isShiny);
  const title = buildTitleForRandomCaptureEmbed(isShiny, pokemon, color);

  const baseDescription = buildDescriptionForPokemonCaptureEmbed({
    pokemon,
    isShiny,
    isNewPokemon: !isInPokedex,
    trainerName,
    zone,
  });

  const levelUpMessage =
    leveledUp && typeof newLevel === "number"
      ? `\n\n⬆️ ${trainerName} est monté niveau ${newLevel} !`
      : "";

  const description = `${baseDescription}${levelUpMessage}`;

  const footer = editFooter({
    pokemonName: pokemon.name,
    isInPokedex,
    trainerName,
    gainedXp,
  });

  const embed = buildEmbed(
    title,
    spriteUrl,
    color.color,
    description,
    footer,
  );

  return {
    embed,
    footer,
    isInPokedex,
  };
}