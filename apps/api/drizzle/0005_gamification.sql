ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" varchar(32);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "leaderboard_opt_in" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "leaderboard_slug" varchar(12);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_leaderboard_slug_uidx" ON "users" USING btree ("leaderboard_slug") WHERE "leaderboard_slug" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_gamification" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"last_active_date" date,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"barcode_scan_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_gamification" ADD CONSTRAINT "user_gamification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_achievements" (
	"user_id" uuid NOT NULL,
	"achievement_id" varchar(64) NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_achievements_user_id_achievement_id_pk" PRIMARY KEY("user_id","achievement_id")
);
--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_achievements_user_id_idx" ON "user_achievements" USING btree ("user_id");
