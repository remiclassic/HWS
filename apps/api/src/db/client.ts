import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const connectionString =
  process.env["DATABASE_URL"] ?? "postgresql://spotter:spotter_dev@localhost:5433/hotwheels_spotter";

const pool = new pg.Pool({ connectionString });

export const db = drizzle(pool, { schema });
export { pool };
