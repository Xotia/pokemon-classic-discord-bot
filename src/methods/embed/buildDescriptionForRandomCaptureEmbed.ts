import { BuildDescriptionParams } from "../../types/Params";
import { loadUnlockedZones } from "../../utils/loadUnlockedZones";
import { getTypeLabel } from "../../config/typeLabels";

function getZoneLabel(guildId: string, zoneId: string): string {
  const allZones = Object.values(loadUnlockedZones(guildId)).flat();
  return allZones.find((z) => z.id === zoneId)?.label ?? zoneId;
}

export function buildDescriptionForPokemonCaptureEmbed({
  guildId,
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
    zone ? `📍 Zone : **${getZoneLabel(guildId, zone)}**` : "",
    isNewPokemon ? `🆕 C'est la première fois que ${trainerName} capture un ${pokemon.name}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}