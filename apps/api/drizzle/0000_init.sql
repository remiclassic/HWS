CREATE TYPE "public"."line_type" AS ENUM('Mainline', 'Premium', 'RLC', 'TeamTransport', 'Entertainment', 'Other');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('official', 'community');--> statement-breakpoint
CREATE TYPE "public"."treasure_hunt_type" AS ENUM('None', 'TH', 'STH');--> statement-breakpoint
CREATE TYPE "public"."user_car_condition" AS ENUM('Carded', 'Loose', 'Custom');--> statement-breakpoint
CREATE TYPE "public"."user_car_status" AS ENUM('Owned', 'Want', 'Duplicate');--> statement-breakpoint
CREATE TABLE "canonical_cars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"casting_name" varchar(512) NOT NULL,
	"year" integer NOT NULL,
	"series" varchar(255),
	"line_type" "line_type" DEFAULT 'Mainline' NOT NULL,
	"treasure_hunt_type" "treasure_hunt_type" DEFAULT 'None' NOT NULL,
	"description" text,
	"model_number" varchar(64),
	"case_code" varchar(64),
	"sku" varchar(64),
	"last_verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "car_community_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"body" text NOT NULL,
	"source_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "car_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"official_image_url" text NOT NULL,
	"source_id" uuid,
	"attribution_note" text
);
--> statement-breakpoint
CREATE TABLE "car_source_attributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"field_path" varchar(128) NOT NULL,
	"value" text,
	"source_id" uuid NOT NULL,
	"confidence_score" real DEFAULT 0.8 NOT NULL,
	"is_rumor" boolean DEFAULT false NOT NULL,
	"cited_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "car_variations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"car_id" uuid NOT NULL,
	"wheels" text,
	"deco" text,
	"region" varchar(128),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "source_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "source_type" NOT NULL,
	"base_url" text,
	"trust_weight" real DEFAULT 0.5 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "user_cars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"car_id" uuid NOT NULL,
	"status" "user_car_status" DEFAULT 'Owned' NOT NULL,
	"condition" "user_car_condition" DEFAULT 'Carded' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"date_added" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "car_community_notes" ADD CONSTRAINT "car_community_notes_car_id_canonical_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."canonical_cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_community_notes" ADD CONSTRAINT "car_community_notes_source_id_source_registry_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_images" ADD CONSTRAINT "car_images_car_id_canonical_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."canonical_cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_images" ADD CONSTRAINT "car_images_source_id_source_registry_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_source_attributions" ADD CONSTRAINT "car_source_attributions_car_id_canonical_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."canonical_cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_source_attributions" ADD CONSTRAINT "car_source_attributions_source_id_source_registry_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_variations" ADD CONSTRAINT "car_variations_car_id_canonical_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."canonical_cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cars" ADD CONSTRAINT "user_cars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cars" ADD CONSTRAINT "user_cars_car_id_canonical_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."canonical_cars"("id") ON DELETE cascade ON UPDATE no action;