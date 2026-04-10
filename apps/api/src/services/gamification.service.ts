import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import {
  ACHIEVEMENT_CATALOG,
  achievementDefinitionById,
  achievementRuleSatisfied,
  levelFromTotalXp,
  type GarageGamificationStats,
  type MeGamificationResponse,
  type LeaderboardResponse,
  type PublicCollectorProfile,
} from "@hotwheels/shared";
import { db } from "../db/client.js";
import {
  canonicalCars,
  userAchievements,
  userCarPhotos,
  userCars,
  userGamification,
  users,
} from "../db/schema.js";

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const SLUG_LEN = 10;

function utcTodayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function addUtcDaysYmd(ymd: string, deltaDays: number): string {
  const [ys, ms, ds] = ymd.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

async function ensureGamificationRow(userId: string) {
  const existing = await db
    .select()
    .from(userGamification)
    .where(eq(userGamification.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];
  try {
    await db.insert(userGamification).values({ userId });
  } catch {
    /* parallel create */
  }
  const [row] = await db
    .select()
    .from(userGamification)
    .where(eq(userGamification.userId, userId))
    .limit(1);
  if (!row) throw new Error("GAMIFICATION_ROW_MISSING");
  return row;
}

/**
 * Streak rule (UTC calendar dates):
 * - If `last_active_date` is today: no change.
 * - If it was yesterday: increment `current_streak`.
 * - If null or older than yesterday: set `current_streak` to 1.
 * Always set `last_active_date` to today after processing.
 * Update `longest_streak` when `current_streak` exceeds it.
 */
export async function recordGamificationActivity(userId: string): Promise<void> {
  const row = await ensureGamificationRow(userId);
  const today = utcTodayYmd();
  const yesterday = addUtcDaysYmd(today, -1);
  const last = row.lastActiveDate ?? null;

  let nextStreak = row.currentStreak;
  if (last === today) {
    return;
  }
  if (last === yesterday) {
    nextStreak = row.currentStreak + 1;
  } else {
    nextStreak = 1;
  }

  const nextLongest = Math.max(row.longestStreak, nextStreak);
  await db
    .update(userGamification)
    .set({
      lastActiveDate: today,
      currentStreak: nextStreak,
      longestStreak: nextLongest,
    })
    .where(eq(userGamification.userId, userId));
}

async function loadGarageStats(userId: string, barcodeScanCount: number): Promise<GarageGamificationStats> {
  const [agg] = await db
    .select({
      totalGarageRows: sql<number>`count(*)::int`,
      ownedUniqueCount: sql<number>`count(*) filter (where ${userCars.status} = 'Owned')::int`,
      wantCount: sql<number>`count(*) filter (where ${userCars.status} = 'Want')::int`,
      duplicateCount: sql<number>`count(*) filter (where ${userCars.status} = 'Duplicate')::int`,
      ownedThCount: sql<number>`count(*) filter (where ${userCars.status} = 'Owned' and ${canonicalCars.treasureHuntType} = 'TH')::int`,
      ownedSthCount: sql<number>`count(*) filter (where ${userCars.status} = 'Owned' and ${canonicalCars.treasureHuntType} = 'STH')::int`,
      ownedMainlineCount: sql<number>`count(*) filter (where ${userCars.status} = 'Owned' and ${canonicalCars.lineType} = 'Mainline')::int`,
    })
    .from(userCars)
    .innerJoin(canonicalCars, eq(userCars.carId, canonicalCars.id))
    .where(eq(userCars.userId, userId));

  const [ph] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(userCarPhotos)
    .innerJoin(userCars, eq(userCarPhotos.userCarId, userCars.id))
    .where(eq(userCars.userId, userId));

  return {
    totalGarageRows: agg?.totalGarageRows ?? 0,
    ownedUniqueCount: agg?.ownedUniqueCount ?? 0,
    wantCount: agg?.wantCount ?? 0,
    duplicateCount: agg?.duplicateCount ?? 0,
    ownedThCount: agg?.ownedThCount ?? 0,
    ownedSthCount: agg?.ownedSthCount ?? 0,
    totalPhotos: ph?.c ?? 0,
    ownedMainlineCount: agg?.ownedMainlineCount ?? 0,
    barcodeScanCount,
  };
}

/**
 * Sync achievements and total XP to match current stats (adds, removes, and adjusts XP).
 */
export async function syncAchievementsAndXp(userId: string): Promise<void> {
  const row = await ensureGamificationRow(userId);
  const stats = await loadGarageStats(userId, row.barcodeScanCount);
  const eligibleIds = ACHIEVEMENT_CATALOG.filter((a) =>
    achievementRuleSatisfied(a.rule, stats),
  ).map((a) => a.id);

  const eligibleSet = new Set(eligibleIds);
  const totalXp = ACHIEVEMENT_CATALOG.filter((a) => eligibleSet.has(a.id)).reduce((s, a) => s + a.xp, 0);

  await db.transaction(async (tx) => {
    const existingRows = await tx
      .select({ id: userAchievements.achievementId })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));
    const current = new Set(existingRows.map((r) => r.id));

    const toRemove = [...current].filter((id) => !eligibleSet.has(id));
    const toAdd = [...eligibleSet].filter((id) => !current.has(id));

    if (toRemove.length) {
      await tx.delete(userAchievements).where(
        and(eq(userAchievements.userId, userId), inArray(userAchievements.achievementId, toRemove)),
      );
    }
    if (toAdd.length > 0) {
      await tx.insert(userAchievements).values(
        toAdd.map((achievementId) => ({
          userId,
          achievementId,
          unlockedAt: new Date(),
        })),
      );
    }

    await tx
      .update(userGamification)
      .set({ totalXp })
      .where(eq(userGamification.userId, userId));
  });
}

export async function recordBarcodeScan(userId: string): Promise<void> {
  await ensureGamificationRow(userId);
  await db
    .update(userGamification)
    .set({ barcodeScanCount: sql`${userGamification.barcodeScanCount} + 1` })
    .where(eq(userGamification.userId, userId));
  await recordGamificationActivity(userId);
  await syncAchievementsAndXp(userId);
}

async function randomSlug(): Promise<string> {
  const bytes = randomBytes(SLUG_LEN);
  let s = "";
  for (let i = 0; i < SLUG_LEN; i++) {
    s += SLUG_ALPHABET[bytes[i]! % SLUG_ALPHABET.length]!;
  }
  return s;
}

export async function ensureLeaderboardSlug(userId: string): Promise<string> {
  const [u] = await db
    .select({ slug: users.leaderboardSlug })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (u?.slug) return u.slug;
  for (let attempt = 0; attempt < 12; attempt++) {
    const slug = await randomSlug();
    try {
      await db.update(users).set({ leaderboardSlug: slug }).where(eq(users.id, userId));
      return slug;
    } catch {
      /* unique collision */
    }
  }
  throw new Error("LEADERBOARD_SLUG_FAILED");
}

export async function patchLeaderboardProfile(
  userId: string,
  body: { display_name?: string | null; leaderboard_opt_in?: boolean },
): Promise<void> {
  const [u] = await db
    .select({
      displayName: users.displayName,
      leaderboardOptIn: users.leaderboardOptIn,
      leaderboardSlug: users.leaderboardSlug,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) return;

  let displayName = u.displayName ?? null;
  let optIn = u.leaderboardOptIn;
  let slug: string | null = u.leaderboardSlug ?? null;

  if (body.display_name !== undefined) {
    displayName = body.display_name?.trim() ? body.display_name.trim().slice(0, 32) : null;
  }
  if (body.leaderboard_opt_in !== undefined) {
    optIn = body.leaderboard_opt_in;
  }

  if (optIn) {
    if (!displayName) displayName = "Collector";
    if (!slug) slug = await ensureLeaderboardSlug(userId);
  } else {
    slug = null;
  }

  await db
    .update(users)
    .set({
      displayName,
      leaderboardOptIn: optIn,
      leaderboardSlug: slug,
    })
    .where(eq(users.id, userId));
}

export async function getMeGamification(userId: string): Promise<MeGamificationResponse> {
  await recordGamificationActivity(userId);
  await syncAchievementsAndXp(userId);

  const [g] = await db
    .select()
    .from(userGamification)
    .where(eq(userGamification.userId, userId))
    .limit(1);
  const [u] = await db
    .select({
      displayName: users.displayName,
      leaderboardOptIn: users.leaderboardOptIn,
      leaderboardSlug: users.leaderboardSlug,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const achRows = await db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.unlockedAt));

  const achievements = achRows
    .map((r) => {
      const def = achievementDefinitionById(r.achievementId);
      if (!def) return null;
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        unlocked_at: r.unlockedAt.toISOString(),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const totalXp = g?.totalXp ?? 0;
  return {
    total_xp: totalXp,
    level: levelFromTotalXp(totalXp),
    current_streak: g?.currentStreak ?? 0,
    longest_streak: g?.longestStreak ?? 0,
    barcode_scan_count: g?.barcodeScanCount ?? 0,
    achievements,
    display_name: u?.displayName ?? null,
    leaderboard_opt_in: u?.leaderboardOptIn ?? false,
    leaderboard_slug: u?.leaderboardSlug ?? null,
  };
}

export async function getLeaderboard(limit: number, viewerUserId: string | null): Promise<LeaderboardResponse> {
  const lim = Math.min(Math.max(limit, 1), 100);
  const rows = await db
    .select({
      slug: users.leaderboardSlug,
      displayName: users.displayName,
      totalXp: userGamification.totalXp,
      userId: users.id,
    })
    .from(users)
    .innerJoin(userGamification, eq(users.id, userGamification.userId))
    .where(and(eq(users.leaderboardOptIn, true), isNotNull(users.leaderboardSlug)))
    .orderBy(desc(userGamification.totalXp))
    .limit(lim);

  const entries = rows.map((r, i) => ({
    rank: i + 1,
    display_name: r.displayName ?? "Collector",
    level: levelFromTotalXp(r.totalXp),
    total_xp: r.totalXp,
    leaderboard_slug: r.slug!,
    is_you: viewerUserId !== null && r.userId === viewerUserId,
  }));

  return { entries };
}

export async function getPublicProfileBySlug(
  slug: string,
): Promise<PublicCollectorProfile | null> {
  const slugNorm = slug.trim().toLowerCase();
  const [row] = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      leaderboardSlug: users.leaderboardSlug,
      leaderboardOptIn: users.leaderboardOptIn,
      totalXp: userGamification.totalXp,
      currentStreak: userGamification.currentStreak,
    })
    .from(users)
    .innerJoin(userGamification, eq(users.id, userGamification.userId))
    .where(eq(users.leaderboardSlug, slugNorm))
    .limit(1);

  if (!row || !row.leaderboardOptIn || !row.leaderboardSlug) return null;

  const [cnt] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(userAchievements)
    .where(eq(userAchievements.userId, row.userId));

  const higher = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(users)
    .innerJoin(userGamification, eq(users.id, userGamification.userId))
    .where(
      and(
        eq(users.leaderboardOptIn, true),
        isNotNull(users.leaderboardSlug),
        gt(userGamification.totalXp, row.totalXp),
      ),
    );

  const rank = (higher[0]?.c ?? 0) + 1;

  return {
    display_name: row.displayName ?? "Collector",
    leaderboard_slug: row.leaderboardSlug,
    level: levelFromTotalXp(row.totalXp),
    total_xp: row.totalXp,
    current_streak: row.currentStreak,
    achievement_count: cnt?.c ?? 0,
    leaderboard_rank: rank,
  };
}
