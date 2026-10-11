import { levelFromTotalXp } from "@hotwheels/shared";

/** XP needed to reach `level` — inverse of `levelFromTotalXp` (level = 1 + floor(sqrt(xp / 45))). */
export function xpForLevel(level: number): number {
  const steps = Math.max(0, Math.floor(level) - 1);
  return 45 * steps * steps;
}

export type LevelProgress = {
  level: number;
  /** XP earned inside the current level. */
  xpIntoLevel: number;
  /** XP span of the current level. */
  xpForNextLevel: number;
  xpRemaining: number;
  /** 0–1 share of the current level completed. */
  fraction: number;
};

export function levelProgress(totalXp: number): LevelProgress {
  const xp = Number.isFinite(totalXp) && totalXp > 0 ? totalXp : 0;
  const level = levelFromTotalXp(xp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const span = ceiling - floor;
  const into = xp - floor;
  return {
    level,
    xpIntoLevel: into,
    xpForNextLevel: span,
    xpRemaining: ceiling - xp,
    fraction: Math.min(1, Math.max(0, into / span)),
  };
}
