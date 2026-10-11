import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Local Supabase Postgres (from `supabase start`) by default.
// Production: set DATABASE_URL to the Supabase pooler connection string.
export default defineConfig({
  schema: "./schema.ts",
  out: "../supabase/migrations",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  },
});
