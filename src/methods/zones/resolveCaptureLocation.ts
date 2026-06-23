import { CaptureLocationSelection, Zone } from '../../types/zones';
import logger from '../../utils/logger';
import { getGenerationByZone } from './getGenerationByZone';
import { getMaxGeneration } from './getMaxGeneration';
import { getZonesByGeneration } from './getZonesByGeneration';

export async function resolveCaptureLocation(
  interaction: any,
): Promise<CaptureLocationSelection | null> {
  const maxGeneration = getMaxGeneration();

  const generationOption = interaction.options.getString("generation");
  const zoneOption = interaction.options.getString("zone");

  const inferredGenerationFromZone = zoneOption
    ? getGenerationByZone(zoneOption)
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

  const generationZones = getZonesByGeneration(generation);

  if (generationZones.length === 0) {
    throw new Error(`Aucune zone trouvée pour la génération ${generation}`);
  }

  if (zoneOption && !generationZones.some((zone) => zone.id === zoneOption)) {
    logger.info(
      `❌ Zone invalide: zone=${zoneOption}, generation=${generation}`,
    );
    await interaction.editReply(
      `❌ La zone sélectionnée n'appartient pas à la génération ${generation}.`,
    );
    return null;
  }

  const isZoneRandom = zoneOption == null;
  const zone =
    zoneOption ??
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
