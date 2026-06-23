const MAX_LEVEL = 100;

export function xpTotalForLevel(level: number): number {
  const clampedLevel = Math.max(1, Math.min(level, MAX_LEVEL));
  return Math.floor((4 * Math.pow(clampedLevel, 3)) / 5);
}

export function xpToNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0;
  return xpTotalForLevel(level + 1) - xpTotalForLevel(level);
}

export function getLevelFromXp(xp: number): number {
  const safeXp = Math.max(0, xp);

  for (let level = MAX_LEVEL; level >= 1; level--) {
    if (safeXp >= xpTotalForLevel(level)) {
      return level;
    }
  }

  return 1;
}

export function addXp(currentXp: number, gainedXp: number) {
  const totalXp = Math.max(0, currentXp + gainedXp);
  const level = getLevelFromXp(totalXp);
  const currentLevelXp = xpTotalForLevel(level);
  const nextLevelXp = level >= MAX_LEVEL ? currentLevelXp : xpTotalForLevel(level + 1);

  return {
    xp: totalXp,
    level,
    xpIntoLevel: totalXp - currentLevelXp,
    xpForNextLevel: level >= MAX_LEVEL ? 0 : nextLevelXp - totalXp,
    xpNeededBetweenLevels: level >= MAX_LEVEL ? 0 : nextLevelXp - currentLevelXp,
  };
}