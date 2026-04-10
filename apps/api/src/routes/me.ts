import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import {
  meAccountResponseSchema,
  meExportResponseSchema,
  meGamificationResponseSchema,
  meSettingsResponseSchema,
  patchLeaderboardProfileBodySchema,
  patchNotificationPrefsBodySchema,
  registerPushTokenBodySchema,
  userCarSchema,
} from "@hotwheels/shared";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { requireUser } from "../lib/httpAuth.js";
import { listGarage } from "../services/garage.service.js";
import {
  getMeGamification,
  patchLeaderboardProfile,
  recordBarcodeScan,
} from "../services/gamification.service.js";
import {
  deleteAllPushTokensForUser,
  getMeSettings,
  setNotifyWantUpdates,
  upsertExpoPushToken,
} from "../services/meSettings.service.js";

export async function registerMeRoutes(app: FastifyInstance) {
  app.get("/me/account", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;
    const [row] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const body = meAccountResponseSchema.parse({ email: row?.email ?? null });
    reply.send(body);
  });

  app.get("/me/export", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;
    const settings = await getMeSettings(userId);
    const [row] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const items = await listGarage(userId);
    const body = meExportResponseSchema.parse({
      exported_at: new Date().toISOString(),
      email: row?.email ?? null,
      notify_want_updates: settings.notify_want_updates,
      garage_items: items.map((i) => userCarSchema.parse(i)),
    });
    reply.send(body);
  });

  app.delete("/me", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;
    await db.delete(users).where(eq(users.id, userId));
    reply.status(204).send();
  });

  app.get("/me/settings", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;
    const body = meSettingsResponseSchema.parse(await getMeSettings(userId));
    reply.send(body);
  });

  app.patch("/me/notification-preferences", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;
    const parsed = patchNotificationPrefsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      reply.status(400).send({ error: parsed.error.flatten() });
      return;
    }
    await setNotifyWantUpdates(userId, parsed.data.notify_want_updates);
    const body = meSettingsResponseSchema.parse(await getMeSettings(userId));
    reply.send(body);
  });

  app.post("/me/push-token", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;
    const parsed = registerPushTokenBodySchema.safeParse(req.body);
    if (!parsed.success) {
      reply.status(400).send({ error: parsed.error.flatten() });
      return;
    }
    await upsertExpoPushToken(userId, parsed.data.expo_push_token, parsed.data.platform);
    reply.status(204).send();
  });

  app.delete("/me/push-token", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;
    await deleteAllPushTokensForUser(userId);
    reply.status(204).send();
  });

  app.get("/me/gamification", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;
    const body = meGamificationResponseSchema.parse(await getMeGamification(userId));
    reply.send(body);
  });

  app.patch("/me/leaderboard-profile", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;
    const parsed = patchLeaderboardProfileBodySchema.safeParse(req.body);
    if (!parsed.success) {
      reply.status(400).send({ error: parsed.error.flatten() });
      return;
    }
    await patchLeaderboardProfile(userId, parsed.data);
    const body = meGamificationResponseSchema.parse(await getMeGamification(userId));
    reply.send(body);
  });

  app.post("/me/gamification/record-scan", async (req, reply) => {
    const userId = await requireUser(req, reply);
    if (!userId) return;
    await recordBarcodeScan(userId);
    reply.status(204).send();
  });
}
