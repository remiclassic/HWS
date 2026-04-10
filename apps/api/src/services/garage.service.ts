import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { CreateUserCarBody, PatchUserCarBody, UserCarPhotoDto } from "@hotwheels/shared";
import { db } from "../db/client.js";
import { canonicalCars, userCarPhotos, userCars } from "../db/schema.js";
import { userCarPhotoDiskPath, userCarPhotoPublicPath } from "../lib/uploads.js";
import { confidenceByCarIds, getCarById, primaryImageUrlByCarIds, toListItem } from "./cars.service.js";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function photoRowToDto(row: typeof userCarPhotos.$inferSelect): UserCarPhotoDto {
  return {
    id: row.id,
    url: userCarPhotoPublicPath(row.filename),
    created_at: row.createdAt.toISOString(),
  };
}

async function photosByUserCarIds(userCarIds: string[]): Promise<Map<string, UserCarPhotoDto[]>> {
  const map = new Map<string, UserCarPhotoDto[]>();
  if (!userCarIds.length) return map;
  const rows = await db
    .select()
    .from(userCarPhotos)
    .where(inArray(userCarPhotos.userCarId, userCarIds));
  rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const r of rows) {
    const list = map.get(r.userCarId) ?? [];
    list.push(photoRowToDto(r));
    map.set(r.userCarId, list);
  }
  return map;
}

async function unlinkPhotosForUserCar(userCarId: string): Promise<void> {
  const rows = await db
    .select({ filename: userCarPhotos.filename })
    .from(userCarPhotos)
    .where(eq(userCarPhotos.userCarId, userCarId));
  for (const r of rows) {
    try {
      await unlink(userCarPhotoDiskPath(r.filename));
    } catch {
      /* missing file is fine */
    }
  }
}

export async function listGarage(userId: string) {
  const rows = await db
    .select({
      uc: userCars,
      car: canonicalCars,
    })
    .from(userCars)
    .innerJoin(canonicalCars, eq(userCars.carId, canonicalCars.id))
    .where(eq(userCars.userId, userId))
    .orderBy(desc(userCars.dateAdded));

  const carIds = rows.map((r) => r.car.id);
  const [conf, primaryImgs] = await Promise.all([
    confidenceByCarIds(carIds),
    primaryImageUrlByCarIds(carIds),
  ]);
  const photoMap = await photosByUserCarIds(rows.map((r) => r.uc.id));

  return rows.map(({ uc, car }) => {
    const listPayload = toListItem(car, conf.get(car.id) ?? 0.5, primaryImgs.get(car.id) ?? null);
    return {
      id: uc.id,
      user_id: uc.userId,
      car_id: uc.carId,
      status: uc.status,
      condition: uc.condition,
      quantity: uc.quantity,
      notes: uc.notes,
      date_added: uc.dateAdded.toISOString(),
      car: listPayload,
      photos: photoMap.get(uc.id) ?? [],
    };
  });
}

export async function createUserCar(userId: string, body: CreateUserCarBody) {
  const exists = await db
    .select({ id: canonicalCars.id })
    .from(canonicalCars)
    .where(eq(canonicalCars.id, body.car_id))
    .limit(1);
  if (!exists.length) throw new Error("CAR_NOT_FOUND");

  const [row] = await db
    .insert(userCars)
    .values({
      userId,
      carId: body.car_id,
      status: body.status,
      condition: body.condition,
      quantity: body.quantity,
      notes: body.notes ?? null,
    })
    .onConflictDoUpdate({
      target: [userCars.userId, userCars.carId],
      set: {
        status: body.status,
        condition: body.condition,
        quantity: body.quantity,
        notes: body.notes ?? null,
      },
    })
    .returning();

  if (!row) throw new Error("INSERT_FAILED");
  const detail = await getCarById(body.car_id);
  return {
    ...mapUserCar(row),
    photos: [],
    car: detail
      ? {
          id: detail.id,
          casting_name: detail.casting_name,
          year: detail.year,
          series: detail.series,
          line_type: detail.line_type,
          treasure_hunt_type: detail.treasure_hunt_type,
          confidence_score: detail.confidence_score,
          primary_image_url: detail.primary_image_url,
        }
      : undefined,
  };
}

function mapUserCar(uc: typeof userCars.$inferSelect) {
  return {
    id: uc.id,
    user_id: uc.userId,
    car_id: uc.carId,
    status: uc.status,
    condition: uc.condition,
    quantity: uc.quantity,
    notes: uc.notes,
    date_added: uc.dateAdded.toISOString(),
    photos: [] as UserCarPhotoDto[],
  };
}

export async function patchUserCar(userId: string, id: string, body: PatchUserCarBody) {
  const existingRows = await db
    .select()
    .from(userCars)
    .where(and(eq(userCars.id, id), eq(userCars.userId, userId)))
    .limit(1);
  const existing = existingRows[0];
  if (!existing) return null;

  const [row] = await db
    .update(userCars)
    .set({
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.condition !== undefined ? { condition: body.condition } : {}),
      ...(body.quantity !== undefined ? { quantity: body.quantity } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    })
    .where(eq(userCars.id, id))
    .returning();

  if (!row) return null;
  const detail = await getCarById(row.carId);
  const photoMap = await photosByUserCarIds([row.id]);
  return {
    ...mapUserCar(row),
    photos: photoMap.get(row.id) ?? [],
    car: detail
      ? {
          id: detail.id,
          casting_name: detail.casting_name,
          year: detail.year,
          series: detail.series,
          line_type: detail.line_type,
          treasure_hunt_type: detail.treasure_hunt_type,
          confidence_score: detail.confidence_score,
          primary_image_url: detail.primary_image_url,
        }
      : undefined,
  };
}

export async function deleteUserCar(userId: string, id: string) {
  const owned = await db
    .select({ id: userCars.id })
    .from(userCars)
    .where(and(eq(userCars.id, id), eq(userCars.userId, userId)))
    .limit(1);
  if (!owned.length) return false;
  await unlinkPhotosForUserCar(id);
  const deleted = await db
    .delete(userCars)
    .where(and(eq(userCars.id, id), eq(userCars.userId, userId)))
    .returning({ id: userCars.id });
  return deleted.length > 0;
}

export async function addUserCarPhoto(
  userId: string,
  userCarId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<UserCarPhotoDto | null> {
  const normalized = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  const ext = MIME_TO_EXT[normalized];
  if (!ext) return null;

  const owner = await db
    .select({ id: userCars.id })
    .from(userCars)
    .where(and(eq(userCars.id, userCarId), eq(userCars.userId, userId)))
    .limit(1);
  if (!owner.length) return null;

  const id = randomUUID();
  const filename = `${id}${ext}`;
  const diskPath = userCarPhotoDiskPath(filename);
  await writeFile(diskPath, buffer);

  try {
    const [inserted] = await db
      .insert(userCarPhotos)
      .values({
        id,
        userCarId,
        filename,
        mimeType: normalized,
      })
      .returning();
    if (!inserted) {
      await unlink(diskPath).catch(() => undefined);
      return null;
    }
    return photoRowToDto(inserted);
  } catch {
    await unlink(diskPath).catch(() => undefined);
    throw new Error("PHOTO_INSERT_FAILED");
  }
}

export async function deleteUserCarPhoto(
  userId: string,
  userCarId: string,
  photoId: string,
): Promise<boolean> {
  const rows = await db
    .select({ uc: userCars, ph: userCarPhotos })
    .from(userCarPhotos)
    .innerJoin(userCars, eq(userCarPhotos.userCarId, userCars.id))
    .where(
      and(
        eq(userCarPhotos.id, photoId),
        eq(userCarPhotos.userCarId, userCarId),
        eq(userCars.userId, userId),
      ),
    )
    .limit(1);
  const hit = rows[0];
  if (!hit) return false;
  try {
    await unlink(userCarPhotoDiskPath(hit.ph.filename));
  } catch {
    /* ok */
  }
  await db.delete(userCarPhotos).where(eq(userCarPhotos.id, photoId));
  return true;
}
