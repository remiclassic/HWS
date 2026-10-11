import { describe, expect, it } from "vitest";
import { levelFromTotalXp } from "@hotwheels/shared";
import { levelProgress, xpForLevel } from "./levelProgress";

describe("xpForLevel", () => {
  it("is the exact threshold where levelFromTotalXp steps up", () => {
    for (const level of [1, 2, 3, 5, 10, 25]) {
      const threshold = xpForLevel(level);
      expect(levelFromTotalXp(threshold)).toBe(level);
      if (level > 1) expect(levelFromTotalXp(threshold - 1)).toBe(level - 1);
    }
  });
});

describe("levelProgress", () => {
  it("starts level 1 at zero", () => {
    expect(levelProgress(0)).toEqual({
      level: 1,
      xpIntoLevel: 0,
      xpForNextLevel: 45,
      xpRemaining: 45,
      fraction: 0,
    });
  });

  it("reports progress inside a level", () => {
    // Level 2 spans 45–180 XP
    expect(levelProgress(90)).toEqual({
      level: 2,
      xpIntoLevel: 45,
      xpForNextLevel: 135,
      xpRemaining: 90,
      fraction: 45 / 135,
    });
  });

  it("treats bad input as zero XP", () => {
    expect(levelProgress(Number.NaN).level).toBe(1);
    expect(levelProgress(-5).fraction).toBe(0);
  });
});
