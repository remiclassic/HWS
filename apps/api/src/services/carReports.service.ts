import { desc, eq } from "drizzle-orm";
import type { CreateCarDataReportBody } from "@hotwheels/shared";
import { db } from "../db/client.js";
import { canonicalCars, carDataReports } from "../db/schema.js";

export async function createCarDataReport(
  userId: string,
  carId: string,
  body: CreateCarDataReportBody,
): Promise<{ id: string } | null> {
  const [car] = await db
    .select({ id: canonicalCars.id })
    .from(canonicalCars)
    .where(eq(canonicalCars.id, carId))
    .limit(1);
  if (!car) return null;

  const [row] = await db
    .insert(carDataReports)
    .values({
      userId,
      carId,
      message: body.message,
      fieldPath: body.field_path ?? null,
    })
    .returning({ id: carDataReports.id });

  return row ?? null;
}

export async function listCarDataReportsInternal(limit: number, offset: number) {
  return db
    .select()
    .from(carDataReports)
    .orderBy(desc(carDataReports.createdAt))
    .limit(limit)
    .offset(offset);
}
