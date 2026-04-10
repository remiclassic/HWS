import { describe, expect, it } from "vitest";
import {
  achievementRuleSatisfied,
  levelFromTotalXp,
  type GarageGamificationStats,
} from "@hotwheels/shared";

const emptyStats = (): GarageGamificationStats => ({
  totalGarageRows: 0,
  ownedUniqueCount: 0,
  wantCount: 0,
  duplicateCount: 0,
  ownedThCount: 0,
  ownedSthCount: 0,
  totalPhotos: 0,
  ownedMainlineCount: 0,
  barcodeScanCount: 0,
});

describe("levelFromTotalXp", () => {
  it("returns 1 for zero or negative", () => {
    expect(levelFromTotalXp(0)).toBe(1);
    expect(levelFromTotalXp(-1)).toBe(1);
  });
  it("increases with xp", () => {
    expect(levelFromTotalXp(500)).toBeGreaterThan(levelFromTotalXp(10));
  });
});

describe("achievementRuleSatisfied", () => {
  it("respects barcode scan threshold", () => {
    const s = emptyStats();
    expect(
      achievementRuleSatisfied({ kind: "barcode_scans_min", n: 3 }, { ...s, barcodeScanCount: 2 }),
    ).toBe(false);
    expect(
      achievementRuleSatisfied({ kind: "barcode_scans_min", n: 3 }, { ...s, barcodeScanCount: 3 }),
    ).toBe(true);
  });
});
