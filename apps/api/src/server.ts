import "dotenv/config";
import path from "node:path";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { ensureUserCarPhotoDir, getUploadRoot } from "./lib/uploads.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerCarRoutes } from "./routes/cars.js";
import { registerGarageRoutes } from "./routes/garage.js";
import { registerIngestionRoutes } from "./routes/ingestion.js";

const port = Number(process.env["PORT"] ?? 3001);
const corsOrigin = process.env["CORS_ORIGIN"] ?? "*";

const app = Fastify({ logger: true });

await app.register(cors, { origin: corsOrigin });

await ensureUserCarPhotoDir();
await app.register(fastifyStatic, {
  root: path.resolve(getUploadRoot()),
  prefix: "/uploads/",
  decorateReply: false,
});
await app.register(multipart, {
  limits: { fileSize: 5 * 1024 * 1024 },
});

await registerAuthRoutes(app);
await registerCarRoutes(app);
await registerGarageRoutes(app);
await registerIngestionRoutes(app);

app.get("/health", async () => ({ ok: true }));

const start = async () => {
  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

await start();
