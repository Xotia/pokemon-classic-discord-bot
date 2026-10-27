import { CaptureLocationSelection, Zone } from '../../types/zones';
import { getLoggerForGuild } from '../../utils/logger';
import { loadUnlockedZones } from '../../utils/loadUnlockedZones';
import { getAvailableGenerations } from './getAvailableGenerations';
import { getGenerationByZone } from './getGenerationByZone';
import { getZonesByGeneration } from './getZonesByGeneration';
import { findEventZone } from '../../features/events/eventZones';

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
  const availableGenerations = getAvailableGenerations(guildId);

  const generationOption = interaction.options.getString("generation");
  const zoneOption = interaction.options.getString("zone");

  const eventZone = zoneOption ? findEventZone(zoneOption) : undefined;
  if (eventZone) {
    if (!eventZone.isActive()) {
      await interaction.editReply("❌ Cette zone n'est plus accessible.");
      return null;
    }
    if (generationOption != null) {
      await interaction.editReply(
        `❌ La zone « ${eventZone.label} » n'appartient à aucune génération : retire le filtre de génération pour y accéder.`,
      );
      return null;
    }
    return {
      generation: eventZone.generationToken,
      zone: eventZone.zoneId,
      selectedZone: { id: eventZone.zoneId, label: eventZone.label },
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

  if (isGenerationRandom && availableGenerations.length === 0) {
    getLoggerForGuild(guildId).error(
      "❌ Capture impossible : aucune zone débloquée, toutes générations confondues.",
    );
    await interaction.editReply(
      "❌ Aucune zone n'est débloquée pour le moment, la capture est impossible.",
    );
    return null;
  }

  const generation =
    generationOption ??
    inferredGenerationFromZone ??
    availableGenerations[
      Math.floor(Math.random() * availableGenerations.length)
    ];

  const generationZones = getZonesByGeneration(guildId, generation);

  if (generationZones.length === 0) {
    getLoggerForGuild(guildId).info(
      `❌ Génération sans zone débloquée: generation=${generation}`,
    );
    await interaction.editReply(
      `❌ Aucune zone de la génération ${generation.replace("gen", "")} n'est encore débloquée.`,
    );
    return null;
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
