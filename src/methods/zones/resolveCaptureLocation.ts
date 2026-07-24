import { CaptureLocationSelection, Zone } from '../../types/zones';
import { getLoggerForGuild } from '../../utils/logger';
import { loadUnlockedZones } from '../../utils/loadUnlockedZones';
import { getGenerationByZone } from './getGenerationByZone';
import { getMaxGeneration } from './getMaxGeneration';
import { getZonesByGeneration } from './getZonesByGeneration';
import {
  isMeteoriteEventActive,
  matchesMeteoriteZone,
  METEORITE_ZONE_ID,
  METEORITE_ZONE_LABEL,
  METEORITE_GENERATION_TOKEN,
} from '../../features/meteoriteEvent/meteoriteEventConfig';

function resolveZoneId(guildId: string, input: string): string | undefined {
  const allZones = Object.values(loadUnlockedZones(guildId)).flat();
  const byId = allZones.find((z) => z.id === input);
  if (byId) return byId.id;
  const byLabel = allZones.find((z) => z.label === input);
  return byLabel?.id;
}

export async function resolveCaptureLocation(
  interaction: any,
  guildId: string,
): Promise<CaptureLocationSelection | null> {
  const maxGeneration = getMaxGeneration(guildId);

  const generationOption = interaction.options.getString("generation");
  const zoneOption = interaction.options.getString("zone");

  if (zoneOption && matchesMeteoriteZone(zoneOption)) {
    if (!isMeteoriteEventActive()) {
      await interaction.editReply("❌ Cette zone n'est plus accessible.");
      return null;
    }
    if (generationOption != null) {
      await interaction.editReply(
        "❌ La zone météorite n'appartient à aucune génération : retire le filtre de génération pour y accéder.",
      );
      return null;
    }
    return {
      generation: METEORITE_GENERATION_TOKEN,
      zone: METEORITE_ZONE_ID,
      selectedZone: { id: METEORITE_ZONE_ID, label: METEORITE_ZONE_LABEL },
      isGenerationChosenByUser: false,
      isGenerationInferredFromZone: false,
      isGenerationRandom: false,
      isZoneRandom: false,
    };
  }

  const resolvedZoneId = zoneOption
    ? resolveZoneId(guildId, zoneOption)
    : undefined;

  const inferredGenerationFromZone = resolvedZoneId
    ? getGenerationByZone(guildId, resolvedZoneId)
    : undefined;

  const isGenerationChosenByUser = generationOption != null;
  const isGenerationInferredFromZone =
    generationOption == null && inferredGenerationFromZone != null;
  const isGenerationRandom =
    generationOption == null && inferredGenerationFromZone == null;

  const generation =
    generationOption ??
    inferredGenerationFromZone ??
    `gen${Math.floor(Math.random() * maxGeneration) + 1}`;

  const generationZones = getZonesByGeneration(guildId, generation);

  if (generationZones.length === 0) {
    throw new Error(`Aucune zone trouvée pour la génération ${generation}`);
  }

  if (resolvedZoneId && !generationZones.some((zone) => zone.id === resolvedZoneId)) {
    getLoggerForGuild(guildId).info(
      `❌ Zone invalide: zone=${zoneOption}, generation=${generation}`,
    );
    await interaction.editReply(
      `❌ La zone sélectionnée n'appartient pas à la génération ${generation}.`,
    );
    return null;
  }

  const isZoneRandom = resolvedZoneId == null;
  const zone =
    resolvedZoneId ??
    generationZones[Math.floor(Math.random() * generationZones.length)].id;

  const selectedZone = generationZones.find((z) => z.id === zone);

  return {
    generation,
    zone,
    selectedZone,
    isGenerationChosenByUser,
    isGenerationInferredFromZone,
    isGenerationRandom,
    isZoneRandom,
  };
}
