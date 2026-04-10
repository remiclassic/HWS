import type { FastifyInstance } from "fastify";
import { authTokenResponseSchema } from "@hotwheels/shared";
import { signUserToken } from "../lib/auth.js";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/anonymous", async (_req, reply) => {
    const [user] = await db.insert(users).values({}).returning();
    if (!user) {
      reply.status(500).send({ error: "User creation failed" });
      return;
    }
    const token = await signUserToken(user.id);
    const body = authTokenResponseSchema.parse({ token, user_id: user.id });
    reply.send(body);
  });
}
