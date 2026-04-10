import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { userPushTokens, users } from "../db/schema.js";

export async function getMeSettings(userId: string) {
  const [row] = await db
    .select({ notify_want_updates: users.notifyWantListUpdates })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return { notify_want_updates: row?.notify_want_updates ?? true };
}

export async function setNotifyWantUpdates(userId: string, value: boolean): Promise<void> {
  await db.update(users).set({ notifyWantListUpdates: value }).where(eq(users.id, userId));
}

export async function upsertExpoPushToken(
  userId: string,
  expoPushToken: string,
  platform: string,
): Promise<void> {
  await db.delete(userPushTokens).where(eq(userPushTokens.expoPushToken, expoPushToken));
  await db.insert(userPushTokens).values({
    userId,
    expoPushToken,
    platform,
    updatedAt: new Date(),
  });
}

export async function deleteAllPushTokensForUser(userId: string): Promise<void> {
  await db.delete(userPushTokens).where(eq(userPushTokens.userId, userId));
}
