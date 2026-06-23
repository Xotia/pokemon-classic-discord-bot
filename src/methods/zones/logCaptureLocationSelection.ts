import { CaptureLocationSelection } from '../../types/zones';
import logger from '../../utils/logger';

export function logCaptureLocationSelection(
  selection: CaptureLocationSelection,
): void {
  const {
    generation,
    zone,
    selectedZone,
    isGenerationChosenByUser,
    isGenerationInferredFromZone,
    isGenerationRandom,
    isZoneRandom,
  } = selection;

  if (isGenerationChosenByUser) {
    logger.info(`🧬 Génération choisie par le joueur: ${generation}`);
  } else if (isGenerationInferredFromZone) {
    logger.info(`🔎 Génération déduite depuis la zone ${zone}: ${generation}`);
  } else if (isGenerationRandom) {
    logger.info(`🎲 Génération sélectionnée aléatoirement: ${generation}`);
  }

  if (isZoneRandom) {
    logger.info(
      `🎲 Zone sélectionnée aléatoirement: ${selectedZone?.label ?? zone}`,
    );
  } else {
    logger.info(
      `🗺️ Zone choisie par le joueur: ${selectedZone?.label ?? zone}`,
    );
  }

  logger.info(
    `📍 Capture lancée avec generation=${generation}, zone=${selectedZone?.label ?? zone}`,
  );
}