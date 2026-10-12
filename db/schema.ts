// Drizzle schema for Hot Wheels Spotter on Supabase.
// - auth.users is owned by Supabase; we model it as a tiny reference table so FKs typecheck.
// - public.user_profiles holds app-specific user data (1:1 with auth.users).
// - Every public table has RLS; policies live in supabase/migrations/*.sql.
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgSchema,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Reference to the Supabase-managed auth.users table (do not migrate this).
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const sourceTypeEnum = pgEnum("source_type", ["official", "community"]);
export const lineTypeEnum = pgEnum("line_type", [
  "Mainline",
  "Premium",
  "RLC",
  "TeamTransport",
  "Entertainment",
  "Other",
]);
export const treasureHuntEnum = pgEnum("treasure_hunt_type", ["None", "TH", "STH"]);
export const userCarStatusEnum = pgEnum("user_car_status", ["Owned", "Want", "Duplicate"]);
export const userCarConditionEnum = pgEnum("user_car_condition", ["Carded", "Loose", "Custom"]);
export const carDataReportStatusEnum = pgEnum("car_data_report_status", ["open", "triaged", "closed"]);

export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id").primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  notifyWantListUpdates: boolean("notify_want_list_updates").notNull().default(true),
  displayName: varchar("display_name", { length: 32 }),
  leaderboardOptIn: boolean("leaderboard_opt_in").notNull().default(false),
  leaderboardSlug: varchar("leaderboard_slug", { length: 12 }).unique(),
  isAdmin: boolean("is_admin").notNull().default(false),
});

export const userPushTokens = pgTable(
  "user_push_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    expoPushToken: text("expo_push_token").notNull(),
    platform: varchar("platform", { length: 16 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("user_push_tokens_expo_push_token_uidx").on(t.expoPushToken)],
);

export const sourceRegistry = pgTable("source_registry", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: sourceTypeEnum("type").notNull(),
  baseUrl: text("base_url"),
  trustWeight: real("trust_weight").notNull().default(0.5),
  active: boolean("active").notNull().default(true),
  metadata: text("metadata"),
});

export const canonicalCars = pgTable("canonical_cars", {
  id: uuid("id").defaultRandom().primaryKey(),
  castingName: varchar("casting_name", { length: 512 }).notNull(),
  year: integer("year").notNull(),
  series: varchar("series", { length: 255 }),
  lineType: lineTypeEnum("line_type").notNull().default("Mainline"),
  treasureHuntType: treasureHuntEnum("treasure_hunt_type").notNull().default("None"),
  description: text("description"),
  modelNumber: varchar("model_number", { length: 64 }),
  caseCode: varchar("case_code", { length: 64 }),
  sku: varchar("sku", { length: 64 }),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  /** Treasure Hunt field guide (null / empty when the casting is not a hunt). */
  thSummary: text("th_summary"),
  thMarkers: text("th_markers").array().notNull().default([]),
});

export const carVariations = pgTable("car_variations", {
  id: uuid("id").defaultRandom().primaryKey(),
  carId: uuid("car_id").notNull().references(() => canonicalCars.id, { onDelete: "cascade" }),
  wheels: text("wheels"),
  deco: text("deco"),
  region: varchar("region", { length: 128 }),
  notes: text("notes"),
});

export const carImages = pgTable("car_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  carId: uuid("car_id").notNull().references(() => canonicalCars.id, { onDelete: "cascade" }),
  officialImageUrl: text("official_image_url").notNull(),
  sourceId: uuid("source_id").references(() => sourceRegistry.id),
  attributionNote: text("attribution_note"),
});

export const carSourceAttributions = pgTable("car_source_attributions", {
  id: uuid("id").defaultRandom().primaryKey(),
  carId: uuid("car_id").notNull().references(() => canonicalCars.id, { onDelete: "cascade" }),
  fieldPath: varchar("field_path", { length: 128 }).notNull(),
  value: text("value"),
  sourceId: uuid("source_id").notNull().references(() => sourceRegistry.id),
  confidenceScore: real("confidence_score").notNull().default(0.8),
  isRumor: boolean("is_rumor").notNull().default(false),
  citedUrl: text("cited_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const carCommunityNotes = pgTable("car_community_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  carId: uuid("car_id").notNull().references(() => canonicalCars.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  sourceId: uuid("source_id").notNull().references(() => sourceRegistry.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const carBarcodes = pgTable("car_barcodes", {
  barcode: varchar("barcode", { length: 64 }).primaryKey(),
  carId: uuid("car_id").notNull().references(() => canonicalCars.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userCars = pgTable(
  "user_cars",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    carId: uuid("car_id").notNull().references(() => canonicalCars.id, { onDelete: "cascade" }),
    status: userCarStatusEnum("status").notNull().default("Owned"),
    condition: userCarConditionEnum("condition").notNull().default("Carded"),
    quantity: integer("quantity").notNull().default(1),
    notes: text("notes"),
    dateAdded: timestamp("date_added", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("user_cars_user_id_car_id_uidx").on(t.userId, t.carId)],
);

export const userCarPhotos = pgTable("user_car_photos", {
  id: uuid("id").primaryKey(),
  userCarId: uuid("user_car_id").notNull().references(() => userCars.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  mimeType: varchar("mime_type", { length: 128 }).notNull(),
  byteSize: integer("byte_size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const carDataReports = pgTable("car_data_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  carId: uuid("car_id").notNull().references(() => canonicalCars.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  fieldPath: varchar("field_path", { length: 128 }),
  status: carDataReportStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notificationSendLog = pgTable(
  "notification_send_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 32 }).notNull(),
    carId: uuid("car_id").references(() => canonicalCars.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("notification_send_log_user_created_idx").on(t.userId, t.createdAt)],
);

export const userGamification = pgTable(
  "user_gamification",
  {
    userId: uuid("user_id").primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
    totalXp: integer("total_xp").notNull().default(0),
    lastActiveDate: date("last_active_date", { mode: "string" }),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    barcodeScanCount: integer("barcode_scan_count").notNull().default(0),
  },
  (t) => [
    // 1:1 with user_profiles. PostgREST only embeds across a direct FK, and the leaderboard
    // queries join these two tables (fetchLeaderboard / fetchPublicCollectorProfile).
    foreignKey({
      name: "user_gamification_user_id_user_profiles_user_id_fk",
      columns: [t.userId],
      foreignColumns: [userProfiles.userId],
    }).onDelete("cascade"),
  ],
);

/**
 * Rule + XP for each achievement, mirroring ACHIEVEMENT_CATALOG in packages/shared.
 * Read by public.sync_user_achievements() (see the achievements_sync migration).
 */
export const achievementDefinitions = pgTable("achievement_definitions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  ruleKind: varchar("rule_kind", { length: 32 }).notNull(),
  threshold: integer("threshold").notNull(),
  xp: integer("xp").notNull(),
});

export const userAchievements = pgTable(
  "user_achievements",
  {
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    achievementId: varchar("achievement_id", { length: 64 }).notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.achievementId] }),
    index("user_achievements_user_id_idx").on(t.userId),
  ],
);

/**
 * Pre-launch waitlist, written by the public landing page (marketing/site) with the anon key.
 * Insert-only for clients; see the waitlist_signups migration for RLS + column grants.
 */
export const waitlistSignups = pgTable(
  "waitlist_signups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 254 }).notNull(),
    platform: varchar("platform", { length: 16 }).notNull().default("any"),
    source: varchar("source", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("waitlist_signups_email_lower_key").on(sql`lower(${t.email})`),
    check("waitlist_signups_email_format", sql`${t.email} ~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'`),
    check("waitlist_signups_platform_check", sql`${t.platform} in ('ios', 'android', 'any')`),
  ],
);
