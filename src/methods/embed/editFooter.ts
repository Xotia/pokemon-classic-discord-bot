import { EditFooterParams } from "../../types/Params";

export function editFooter({
  pokemonName,
  isInPokedex,
  trainerName,
  gainedXp,
  leveledUp,
  newLevel,
}: EditFooterParams): string {
  const footerParts: string[] = [];

  if (!isInPokedex) {
    footerParts.push(`${pokemonName} ajouté au Pokédex de ${trainerName}`);
  } else {
    footerParts.push(`${trainerName} possède déjà ce Pokémon`);
  }

  if (typeof gainedXp === "number") {
    footerParts.push(`+${gainedXp} XP`);
  }

  if (leveledUp && typeof newLevel === "number") {
    footerParts.push(`Niveau ${newLevel}`);
  }

  return footerParts.join(" • ");
}