CREATE TYPE "public"."car_data_report_status" AS ENUM('open', 'triaged', 'closed');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "car_data_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"car_id" uuid NOT NULL,
	"message" text NOT NULL,
	"field_path" varchar(128),
	"status" "car_data_report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "car_data_reports" ADD CONSTRAINT "car_data_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "car_data_reports" ADD CONSTRAINT "car_data_reports_car_id_canonical_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."canonical_cars"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "car_data_reports_car_id_idx" ON "car_data_reports" USING btree ("car_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "car_data_reports_created_at_idx" ON "car_data_reports" USING btree ("created_at");
