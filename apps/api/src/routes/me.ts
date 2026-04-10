import type { FastifyInstance } from "fastify";
import {
  meSettingsResponseSchema,
  patchNotificationPrefsBodySchema,
  registerPushTokenBodySchema,
} from "@hotwheels/shared";
import { requireUser } from "../lib/httpAuth.js";
import {
  deleteAllPushTokensForUser,
  getMeSettings,
  setNotifyWantUpdates,
  upsertExpoPushToken,
} from "../services/meSettings.service.js";

export async function registerMeRoutes(app: FastifyInstance) {
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
}
