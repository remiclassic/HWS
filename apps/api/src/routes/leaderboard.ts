import type { FastifyInstance } from "fastify";
import {
  leaderboardResponseSchema,
  publicCollectorProfileSchema,
} from "@hotwheels/shared";
import { optionalUser } from "../lib/httpAuth.js";
import { getLeaderboard, getPublicProfileBySlug } from "../services/gamification.service.js";

export async function registerLeaderboardRoutes(app: FastifyInstance) {
  app.get("/leaderboard", async (req, reply) => {
    const viewerUserId = await optionalUser(req);
    const q = req.query as { limit?: string };
    const limit = q.limit != null ? Number(q.limit) : 50;
    const body = leaderboardResponseSchema.parse(await getLeaderboard(limit, viewerUserId));
    reply.send(body);
  });

  app.get("/collectors/:slug", async (req, reply) => {
    const slug = (req.params as { slug: string }).slug?.trim().toLowerCase() ?? "";
    if (!slug) {
      reply.status(404).send({ error: "Not found" });
      return;
    }
    const profile = await getPublicProfileBySlug(slug);
    if (!profile) {
      reply.status(404).send({ error: "Not found" });
      return;
    }
    reply.send(publicCollectorProfileSchema.parse(profile));
  });
}
