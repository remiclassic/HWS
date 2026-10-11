import { z } from "zod";

/** Stats used to evaluate achievement rules (server fills from DB). */
export type GarageGamificationStats = {
  totalGarageRows: number;
  ownedUniqueCount: number;
  wantCount: number;
  duplicateCount: number;
  ownedThCount: number;
  ownedSthCount: number;
  totalPhotos: number;
  ownedMainlineCount: number;
  barcodeScanCount: number;
};

export const achievementRuleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("total_garage_min"), n: z.number().int().nonnegative() }),
  z.object({ kind: z.literal("owned_unique_min"), n: z.number().int().nonnegative() }),
  z.object({ kind: z.literal("want_min"), n: z.number().int().nonnegative() }),
  z.object({ kind: z.literal("duplicate_min"), n: z.number().int().nonnegative() }),
  z.object({ kind: z.literal("owned_th_min"), n: z.number().int().nonnegative() }),
  z.object({ kind: z.literal("owned_sth_min"), n: z.number().int().nonnegative() }),
  z.object({ kind: z.literal("photos_min"), n: z.number().int().nonnegative() }),
  z.object({ kind: z.literal("owned_mainline_min"), n: z.number().int().nonnegative() }),
  z.object({ kind: z.literal("barcode_scans_min"), n: z.number().int().nonnegative() }),
]);
export type AchievementRule = z.infer<typeof achievementRuleSchema>;

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  xp: number;
  rule: AchievementRule;
};

export function achievementRuleSatisfied(rule: AchievementRule, s: GarageGamificationStats): boolean {
  switch (rule.kind) {
    case "total_garage_min":
      return s.totalGarageRows >= rule.n;
    case "owned_unique_min":
      return s.ownedUniqueCount >= rule.n;
    case "want_min":
      return s.wantCount >= rule.n;
    case "duplicate_min":
      return s.duplicateCount >= rule.n;
    case "owned_th_min":
      return s.ownedThCount >= rule.n;
    case "owned_sth_min":
      return s.ownedSthCount >= rule.n;
    case "photos_min":
      return s.totalPhotos >= rule.n;
    case "owned_mainline_min":
      return s.ownedMainlineCount >= rule.n;
    case "barcode_scans_min":
      return s.barcodeScanCount >= rule.n;
  }
}

/** Curated list; IDs are stable for `user_achievements.achievement_id`. */
export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
  {
    id: "garage_first",
    title: "First save",
    description: "Add at least one car to your garage.",
    xp: 15,
    rule: { kind: "total_garage_min", n: 1 },
  },
  {
    id: "owned_10",
    title: "Growing fleet",
    description: "Own 10 different castings in your garage.",
    xp: 40,
    rule: { kind: "owned_unique_min", n: 10 },
  },
  {
    id: "owned_50",
    title: "Serious collector",
    description: "Own 50 different castings.",
    xp: 120,
    rule: { kind: "owned_unique_min", n: 50 },
  },
  {
    id: "owned_100",
    title: "Century club",
    description: "Own 100 different castings.",
    xp: 300,
    rule: { kind: "owned_unique_min", n: 100 },
  },
  {
    id: "want_5",
    title: "Wish list",
    description: "Have at least 5 cars on your want list.",
    xp: 25,
    rule: { kind: "want_min", n: 5 },
  },
  {
    id: "want_25",
    title: "Hunter",
    description: "Have at least 25 cars on your want list.",
    xp: 80,
    rule: { kind: "want_min", n: 25 },
  },
  {
    id: "dupe_tracker",
    title: "Dupe tracker",
    description: "Mark at least 5 duplicates in your garage.",
    xp: 30,
    rule: { kind: "duplicate_min", n: 5 },
  },
  {
    id: "th_first",
    title: "Treasure found",
    description: "Own at least one Treasure Hunt casting.",
    xp: 75,
    rule: { kind: "owned_th_min", n: 1 },
  },
  {
    id: "sth_first",
    title: "Super score",
    description: "Own at least one Super Treasure Hunt casting.",
    xp: 200,
    rule: { kind: "owned_sth_min", n: 1 },
  },
  {
    id: "photo_first",
    title: "Shutterbug",
    description: "Add a photo to any garage item.",
    xp: 20,
    rule: { kind: "photos_min", n: 1 },
  },
  {
    id: "photo_10",
    title: "Gallery keeper",
    description: "Collect at least 10 garage photos.",
    xp: 60,
    rule: { kind: "photos_min", n: 10 },
  },
  {
    id: "mainline_25",
    title: "Mainline master",
    description: "Own 25 Mainline castings.",
    xp: 50,
    rule: { kind: "owned_mainline_min", n: 25 },
  },
  {
    id: "scan_1",
    title: "Scanner",
    description: "Log a barcode scan in Spotter.",
    xp: 10,
    rule: { kind: "barcode_scans_min", n: 1 },
  },
  {
    id: "scan_10",
    title: "Peg hunter",
    description: "Log 10 barcode scans.",
    xp: 35,
    rule: { kind: "barcode_scans_min", n: 10 },
  },
  {
    id: "scan_50",
    title: "Aisle regular",
    description: "Log 50 barcode scans.",
    xp: 100,
    rule: { kind: "barcode_scans_min", n: 50 },
  },
  {
    id: "scan_100",
    title: "Barcode veteran",
    description: "Log 100 barcode scans.",
    xp: 200,
    rule: { kind: "barcode_scans_min", n: 100 },
  },
] as const;

const catalogById = new Map(ACHIEVEMENT_CATALOG.map((a) => [a.id, a]));

export function achievementDefinitionById(id: string): AchievementDefinition | undefined {
  return catalogById.get(id);
}

/** XP → level; gentle curve (level 1 at 0 XP). */
export function levelFromTotalXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1;
  return 1 + Math.floor(Math.sqrt(xp / 45));
}

export const meGamificationAchievementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  unlocked_at: z.string().datetime({ offset: true }),
});

export const meGamificationResponseSchema = z.object({
  total_xp: z.number().int().nonnegative(),
  level: z.number().int().positive(),
  current_streak: z.number().int().nonnegative(),
  longest_streak: z.number().int().nonnegative(),
  barcode_scan_count: z.number().int().nonnegative(),
  achievements: z.array(meGamificationAchievementSchema),
  display_name: z.string().nullable(),
  leaderboard_opt_in: z.boolean(),
  leaderboard_slug: z.string().nullable(),
});
export type MeGamificationResponse = z.infer<typeof meGamificationResponseSchema>;

export const patchLeaderboardProfileBodySchema = z.object({
  display_name: z.string().min(1).max(32).nullable().optional(),
  leaderboard_opt_in: z.boolean().optional(),
});
export type PatchLeaderboardProfileBody = z.infer<typeof patchLeaderboardProfileBodySchema>;

export const leaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  display_name: z.string(),
  level: z.number().int().positive(),
  total_xp: z.number().int().nonnegative(),
  leaderboard_slug: z.string(),
  is_you: z.boolean(),
});

export const leaderboardResponseSchema = z.object({
  entries: z.array(leaderboardEntrySchema),
});
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;

export const publicCollectorProfileSchema = z.object({
  display_name: z.string(),
  leaderboard_slug: z.string(),
  level: z.number().int().positive(),
  total_xp: z.number().int().nonnegative(),
  current_streak: z.number().int().nonnegative(),
  achievement_count: z.number().int().nonnegative(),
  leaderboard_rank: z.number().int().positive().nullable(),
});
export type PublicCollectorProfile = z.infer<typeof publicCollectorProfileSchema>;
