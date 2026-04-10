ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notify_want_list_updates" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"expo_push_token" text NOT NULL,
	"platform" varchar(16) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_push_tokens" ADD CONSTRAINT "user_push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_push_tokens_expo_push_token_uidx" ON "user_push_tokens" USING btree ("expo_push_token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_push_tokens_user_id_idx" ON "user_push_tokens" USING btree ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_send_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" varchar(32) NOT NULL,
	"car_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_send_log" ADD CONSTRAINT "notification_send_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_send_log" ADD CONSTRAINT "notification_send_log_car_id_canonical_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."canonical_cars"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_send_log_user_created_idx" ON "notification_send_log" USING btree ("user_id", "created_at");
