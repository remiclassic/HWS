ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" varchar(255);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_uidx" ON "users" USING btree ("email");
