import { and, eq, gte, inArray, sql } from "drizzle-orm";
import Expo, { type ExpoPushMessage } from "expo-server-sdk";
import { db } from "../db/client.js";
import {
  notificationSendLog,
  userCars,
  userPushTokens,
  users,
} from "../db/schema.js";

const KIND_WANT_UPDATE = "want_catalog_update";
const MAX_PUSHES_PER_USER_PER_DAY = 20;

function getExpoClient(): Expo | null {
  const accessToken = process.env["EXPO_ACCESS_TOKEN"];
  if (!accessToken) return null;
  return new Expo({ accessToken });
}

async function countSendsLast24h(userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(notificationSendLog)
       .where(
      and(
        eq(notificationSendLog.userId, userId),
        eq(notificationSendLog.kind, KIND_WANT_UPDATE),
        gte(notificationSendLog.createdAt, since),
      ),
    );
  return row?.c ?? 0;
}

async function logSend(userId: string, carId: string): Promise<void> {
  await db.insert(notificationSendLog).values({
    userId,
    kind: KIND_WANT_UPDATE,
    carId,
  });
}

/**
 * Notify users who have a car on their Want list when catalog data is refreshed for that car.
 */
export async function notifyWantListForCatalogUpdates(
  updates: { carId: string; castingName: string }[],
): Promise<void> {
  const expo = getExpoClient();
  if (!expo) {
    return;
  }

  const dedup = new Map<string, string>();
  for (const u of updates) dedup.set(u.carId, u.castingName);

  for (const [carId, castingName] of dedup) {
    const wantUsers = await db
      .select({ userId: userCars.userId })
      .from(userCars)
      .innerJoin(users, eq(userCars.userId, users.id))
      .where(
        and(
          eq(userCars.carId, carId),
          eq(userCars.status, "Want"),
          eq(users.notifyWantListUpdates, true),
        ),
      );

    const userIds = [...new Set(wantUsers.map((r) => r.userId))];
    if (!userIds.length) continue;

    const tokenRows = await db
      .select()
      .from(userPushTokens)
      .where(inArray(userPushTokens.userId, userIds));

    const userToToken = new Map<string, string>();
    for (const row of tokenRows) {
      if (!userToToken.has(row.userId) && Expo.isExpoPushToken(row.expoPushToken)) {
        userToToken.set(row.userId, row.expoPushToken);
      }
    }

    const messages: ExpoPushMessage[] = [];

    for (const [userId, token] of userToToken) {
      const sent = await countSendsLast24h(userId);
      if (sent >= MAX_PUSHES_PER_USER_PER_DAY) continue;

      messages.push({
        to: token,
        sound: "default",
        title: "Want list · catalog update",
        body: `${castingName} reference data was refreshed.`,
        data: { car_id: carId },
      });
    }

    if (!messages.length) continue;

    const chunks = expo.chunkPushNotifications(messages);
    let chunkIndex = 0;
    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          const msg = chunk[i];
          if (ticket.status === "ok" && msg.to && typeof msg.to === "string") {
            for (const [userId, tok] of userToToken) {
              if (tok === msg.to) {
                await logSend(userId, carId);
                break;
              }
            }
          }
        }
      } catch (e) {
        console.error("expo push chunk failed", chunkIndex, e);
      }
      chunkIndex++;
    }
  }
}
