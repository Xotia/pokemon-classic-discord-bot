import { getGuildConfig } from './guilds';

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePercent(value: number | string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, parsed));
}

export function getShinyRate(guildId: string): number {
  const override = getGuildConfig(guildId)?.shinyRate;
  return override ?? parseNumber(process.env.SHINY_RATE, 256);
}

export function getCooldownMs(guildId: string): number {
  const override = getGuildConfig(guildId)?.cooldownMinutes;
  const minutes = override ?? parseNumber(process.env.COOLDOWN, 30);
  return minutes * 60 * 1000;
}

export function getPityThreshold(guildId: string): number {
  const override = getGuildConfig(guildId)?.pityThreshold;
  return override ?? parseNumber(process.env.PITY_THRESHOLD, 10);
}

export function getPokemonPerPage(guildId: string): number {
  const override = getGuildConfig(guildId)?.pokemonPerPage;
  return override ?? parseNumber(process.env.POKEMON_PER_PAGE, 20);
}

export function getButtonTimeoutMs(guildId: string): number {
  const override = getGuildConfig(guildId)?.buttonTimeoutMs;
  return override ?? parseNumber(process.env.BUTTON_TIMEOUT, 120000);
}

export function getGenerationNumber(guildId: string): number {
  const override = getGuildConfig(guildId)?.generationNumber;
  const value = override ?? parseNumber(process.env.GENERATION_NUMBER, NaN);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`generationNumber invalide ou manquant pour guildId=${guildId}`);
  }

  return value;
}

export function getRaidSchedulerMode(guildId: string): string {
  return getGuildConfig(guildId)?.raidSchedulerMode ?? process.env.RAID_SCHEDULER_MODE ?? 'debug';
}

export function getRaidNextZoneChance(guildId: string): number {
  const override = getGuildConfig(guildId)?.raidNextZoneChance;
  if (override !== undefined) return parsePercent(override, 60);
  return parsePercent(process.env.RAID_NEXT_ZONE_CHANCE, 60);
}

export function getRaidStartHour(guildId: string): string {
  return getGuildConfig(guildId)?.raidStartHour ?? process.env.RAID_START_HOUR ?? '00 12 * * *';
}

export function getRaidEndHour(guildId: string): string {
  return getGuildConfig(guildId)?.raidEndHour ?? process.env.RAID_END_HOUR ?? '00 20 * * *';
}
