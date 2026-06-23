export type ZoneEntry = {
  id: string;
  label: string;
};

export type ZonesByGeneration = Record<string, ZoneEntry[]>;

export type Zone = {
  id: string;
  label: string;
};

export type CaptureLocationSelection = {
  generation: string;
  zone: string;
  selectedZone?: Zone;
  isGenerationChosenByUser: boolean;
  isGenerationInferredFromZone: boolean;
  isGenerationRandom: boolean;
  isZoneRandom: boolean;
};