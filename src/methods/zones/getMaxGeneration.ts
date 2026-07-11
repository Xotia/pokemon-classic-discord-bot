import { getGenerationNumber } from "../../config/guildSettings";

export function getMaxGeneration(guildId: string): number {
  return getGenerationNumber(guildId);
}