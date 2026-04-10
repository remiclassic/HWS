import { randomUUID } from "node:crypto";
import path from "node:path";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { ensureUserCarPhotoDir, getUploadRoot } from "./lib/uploads.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerCarRoutes } from "./routes/cars.js";
import { registerGarageRoutes } from "./routes/garage.js";
import { registerIngestionRoutes } from "./routes/ingestion.js";
import { registerLeaderboardRoutes } from "./routes/leaderboard.js";
import { registerMeRoutes } from "./routes/me.js";

export async function createApp(): Promise<FastifyInstance> {
  const corsOrigin = process.env["CORS_ORIGIN"] ?? "*";

  const app = Fastify({
    logger: {
      level: process.env["LOG_LEVEL"] ?? "info",
    },
    genReqId: () => randomUUID(),
  });

  app.addHook("onRequest", async (req, reply) => {
    reply.header("x-request-id", req.id);
  });

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
  await registerMeRoutes(app);
  await registerLeaderboardRoutes(app);
  await registerIngestionRoutes(app);

  app.get("/health", async () => ({ ok: true }));

  return app;
}
