import { BuildDescriptionParams } from "../../types/Params";
import { loadUnlockedZones } from "../../utils/loadUnlockedZones";
import { getTypeLabel } from "../../config/typeLabels";
import { findZoneById } from "../zones/findZoneById";

function getZoneLabel(guildId: string, zoneId: string): string {
  const allZones = Object.values(loadUnlockedZones(guildId)).flat();
  const found = allZones.find((z) => z.id === zoneId);
  if (found) return found.label;
  const foundInAll = findZoneById(zoneId);
  if (foundInAll) return foundInAll.label;
  return zoneId;
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