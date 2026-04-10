import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { authEmailPasswordBodySchema, authTokenResponseSchema } from "@hotwheels/shared";
import { signUserToken } from "../lib/auth.js";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { requireUser } from "../lib/httpAuth.js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505";
}

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

  app.post("/auth/register", async (req, reply) => {
    const parsed = authEmailPasswordBodySchema.safeParse(req.body);
    if (!parsed.success) {
      reply.status(400).send({ error: parsed.error.flatten() });
      return;
    }
    const email = normalizeEmail(parsed.data.email);
    const passwordHash = hashPassword(parsed.data.password);
    try {
      const [user] = await db
        .insert(users)
        .values({ email, passwordHash })
        .returning();
      if (!user) {
        reply.status(500).send({ error: "User creation failed" });
        return;
      }
      const token = await signUserToken(user.id);
      reply.status(201).send(authTokenResponseSchema.parse({ token, user_id: user.id }));
    } catch (e) {
      if (isUniqueViolation(e)) {
        reply.status(409).send({ error: "Email already registered" });
        return;
      }
      throw e;
    }
  });

  app.post("/auth/login", async (req, reply) => {
    const parsed = authEmailPasswordBodySchema.safeParse(req.body);
    if (!parsed.success) {
      reply.status(400).send({ error: parsed.error.flatten() });
      return;
    }
    const email = normalizeEmail(parsed.data.email);
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user?.passwordHash || !verifyPassword(parsed.data.password, user.passwordHash)) {
      reply.status(401).send({ error: "Invalid email or password" });
      return;
    }
    const token = await signUserToken(user.id);
    reply.send(authTokenResponseSchema.parse({ token, user_id: user.id }));
  });

  /** Attach email + password to the current anonymous JWT user (keeps garage rows on the same user_id). */
  app.post("/auth/link-email", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;

    const parsed = authEmailPasswordBodySchema.safeParse(req.body);
    if (!parsed.success) {
      reply.status(400).send({ error: parsed.error.flatten() });
      return;
    }

    const [current] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!current) {
      reply.status(404).send({ error: "User not found" });
      return;
    }
    if (current.email) {
      reply.status(400).send({ error: "Account already has an email; sign in on another device instead." });
      return;
    }

    const email = normalizeEmail(parsed.data.email);
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (taken) {
      reply.status(409).send({ error: "Email already in use" });
      return;
    }

    const passwordHash = hashPassword(parsed.data.password);
    try {
      await db
        .update(users)
        .set({ email, passwordHash })
        .where(eq(users.id, userId));
    } catch (e) {
      if (isUniqueViolation(e)) {
        reply.status(409).send({ error: "Email already in use" });
        return;
      }
      throw e;
    }

    const token = await signUserToken(userId);
    reply.send(authTokenResponseSchema.parse({ token, user_id: userId }));
  });
}
