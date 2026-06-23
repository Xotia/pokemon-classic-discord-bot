function parsePercent(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, parsed));
}

export const raidConfig = {
  nextZoneChance: parsePercent(process.env.RAID_NEXT_ZONE_CHANCE, 60),
};