import { BuildDescriptionParams } from "../../types/Params";
import { loadUnlockedZones } from "../../utils/loadUnlockedZones";
import { getTypeLabel } from "../../config/typeLabels";

function getZoneLabel(zoneId: string): string {
  const allZones = Object.values(loadUnlockedZones()).flat();
  return allZones.find((z) => z.id === zoneId)?.label ?? zoneId;
}

export function buildDescriptionForPokemonCaptureEmbed({
  pokemon,
  isShiny,
  isNewPokemon,
  trainerName,
  zone,
}: BuildDescriptionParams): string {
  const typesLabel = (pokemon.types ?? []).map(getTypeLabel).join(" / ");

  return [
    `**${trainerName}** a capturé ${pokemon.name}${isShiny ? " ✨" : ""} !`,
    `🆔 N°${pokemon.id}${typesLabel ? ` • ${typesLabel}` : ""}`,
    zone ? `📍 Zone : **${getZoneLabel(zone)}**` : "",
    isNewPokemon ? `🆕 C'est la première fois que ${trainerName} capture un ${pokemon.name}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}