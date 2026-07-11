import { CaptureLocationSelection, Zone } from '../../types/zones';
import { getLoggerForGuild } from '../../utils/logger';
import { loadUnlockedZones } from '../../utils/loadUnlockedZones';
import { getGenerationByZone } from './getGenerationByZone';
import { getMaxGeneration } from './getMaxGeneration';
import { getZonesByGeneration } from './getZonesByGeneration';

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
