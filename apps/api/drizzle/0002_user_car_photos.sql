CREATE TABLE IF NOT EXISTS "user_car_photos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_car_id" uuid NOT NULL,
	"filename" varchar(255) NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_car_photos" ADD CONSTRAINT "user_car_photos_user_car_id_user_cars_id_fk" FOREIGN KEY ("user_car_id") REFERENCES "public"."user_cars"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_car_photos_user_car_id_idx" ON "user_car_photos" USING btree ("user_car_id");
