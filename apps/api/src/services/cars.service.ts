import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
} from "drizzle-orm";
import type { CarsQuery } from "@hotwheels/shared";
import { db } from "../db/client.js";
import {
  carCommunityNotes,
  carImages,
  carSourceAttributions,
  carVariations,
  canonicalCars,
  sourceRegistry,
} from "../db/schema.js";
import { aggregateConfidence } from "../lib/confidence.js";
import { buildThExplanation } from "../lib/thExplanation.js";
import type { LineType, TreasureHuntType } from "@hotwheels/shared";

type CarRow = typeof canonicalCars.$inferSelect;

function mapLineType(v: string): LineType {
  const allowed: LineType[] = [
    "Mainline",
    "Premium",
    "RLC",
    "TeamTransport",
    "Entertainment",
    "Other",
  ];
  return (allowed.includes(v as LineType) ? v : "Other") as LineType;
}

function mapTh(v: string): TreasureHuntType {
  const allowed: TreasureHuntType[] = ["None", "TH", "STH"];
  return (allowed.includes(v as TreasureHuntType) ? v : "None") as TreasureHuntType;
}

/** Batch confidence for list views (garage, etc.). */
export async function confidenceByCarIds(carIds: string[]): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  if (carIds.length === 0) return m;
  const rows = await db
    .select({
      carId: carSourceAttributions.carId,
      confidenceScore: carSourceAttributions.confidenceScore,
      trustWeight: sourceRegistry.trustWeight,
    })
    .from(carSourceAttributions)
    .innerJoin(sourceRegistry, eq(carSourceAttributions.sourceId, sourceRegistry.id))
    .where(inArray(carSourceAttributions.carId, carIds));

  const byCar = new Map<string, { confidenceScore: number; trustWeight: number }[]>();
  for (const r of rows) {
    const list = byCar.get(r.carId) ?? [];
    list.push({ confidenceScore: r.confidenceScore, trustWeight: r.trustWeight });
    byCar.set(r.carId, list);
  }
  for (const id of carIds) {
    m.set(id, aggregateConfidence(byCar.get(id) ?? []));
  }
  return m;
}

function buildWhere(query: CarsQuery) {
  const parts: ReturnType<typeof ilike>[] = [];
  if (query.q?.trim()) {
    const q = `%${query.q.trim()}%`;
    const searchCond = or(ilike(canonicalCars.castingName, q), ilike(canonicalCars.series, q));
    if (searchCond) parts.push(searchCond);
  }
  if (query.year !== undefined) {
    parts.push(eq(canonicalCars.year, query.year));
  }
  if (query.series?.trim()) {
    parts.push(ilike(canonicalCars.series, `%${query.series.trim()}%`));
  }
  if (query.line_type) {
    parts.push(eq(canonicalCars.lineType, query.line_type));
  }
  if (query.treasure_hunt_type) {
    parts.push(eq(canonicalCars.treasureHuntType, query.treasure_hunt_type));
  }
  if (query.sku?.trim()) {
    parts.push(eq(canonicalCars.sku, query.sku.trim()));
  }
  if (query.model_number?.trim()) {
    parts.push(eq(canonicalCars.modelNumber, query.model_number.trim()));
  }
  return parts.length ? and(...parts) : undefined;
}

export async function listCars(query: CarsQuery) {
  const where = buildWhere(query);
  const totalRows = await db
    .select({ n: count() })
    .from(canonicalCars)
    .where(where);
  const total = Number(totalRows[0]?.n ?? 0);

  const rows = await db
    .select()
    .from(canonicalCars)
    .where(where)
    .orderBy(desc(canonicalCars.year), asc(canonicalCars.castingName))
    .limit(query.limit)
    .offset(query.offset);

  const ids = rows.map((r) => r.id);
  const conf = await confidenceByCarIds(ids);

  return {
    total,
    items: rows.map((r) => toListItem(r, conf.get(r.id) ?? 0.5)),
  };
}

export function toListItem(r: CarRow, confidence_score: number) {
  return {
    id: r.id,
    casting_name: r.castingName,
    year: r.year,
    series: r.series,
    line_type: mapLineType(r.lineType),
    treasure_hunt_type: mapTh(r.treasureHuntType),
    confidence_score,
  };
}

export async function getCarById(id: string) {
  const carRows = await db
    .select()
    .from(canonicalCars)
    .where(eq(canonicalCars.id, id))
    .limit(1);
  const car = carRows[0];
  if (!car) return null;

  const [variations, images, attributionsRaw, notesRaw, confRows] = await Promise.all([
    db.select().from(carVariations).where(eq(carVariations.carId, id)),
    db.select().from(carImages).where(eq(carImages.carId, id)),
    db
      .select({
        fieldPath: carSourceAttributions.fieldPath,
        value: carSourceAttributions.value,
        confidenceScore: carSourceAttributions.confidenceScore,
        isRumor: carSourceAttributions.isRumor,
        citedUrl: carSourceAttributions.citedUrl,
        sourceId: sourceRegistry.id,
        sourceName: sourceRegistry.name,
        sourceType: sourceRegistry.type,
        baseUrl: sourceRegistry.baseUrl,
      })
      .from(carSourceAttributions)
      .innerJoin(sourceRegistry, eq(carSourceAttributions.sourceId, sourceRegistry.id))
      .where(eq(carSourceAttributions.carId, id)),
    db
      .select({
        id: carCommunityNotes.id,
        body: carCommunityNotes.body,
        sourceName: sourceRegistry.name,
        sourceType: sourceRegistry.type,
      })
      .from(carCommunityNotes)
      .innerJoin(sourceRegistry, eq(carCommunityNotes.sourceId, sourceRegistry.id))
      .where(eq(carCommunityNotes.carId, id)),
    db
      .select({
        confidenceScore: carSourceAttributions.confidenceScore,
        trustWeight: sourceRegistry.trustWeight,
      })
      .from(carSourceAttributions)
      .innerJoin(sourceRegistry, eq(carSourceAttributions.sourceId, sourceRegistry.id))
      .where(eq(carSourceAttributions.carId, id)),
  ]);

  const confidence_score = aggregateConfidence(confRows);
  const thMarkers = attributionsRaw
    .filter((a) => a.fieldPath === "treasure_hunt_markers" && a.value)
    .map((a) => a.value as string);

  const thType = mapTh(car.treasureHuntType);
  const th_explanation =
    thType === "None"
      ? null
      : buildThExplanation(thType, car.castingName, thMarkers);

  return {
    ...toListItem(car, confidence_score),
    description: car.description,
    identifiers: {
      model_number: car.modelNumber,
      case_code: car.caseCode,
      sku: car.sku,
    },
    known_variations: variations.map((v) => ({
      id: v.id,
      wheels: v.wheels,
      deco: v.deco,
      region: v.region,
      notes: v.notes,
    })),
    images: images.map((im) => ({
      id: im.id,
      official_image_url: im.officialImageUrl,
      attribution_note: im.attributionNote,
    })),
    attributions: attributionsRaw.map((a) => ({
      source_id: a.sourceId,
      source_name: a.sourceName,
      source_type: a.sourceType === "official" ? "official" : "community",
      source_url: a.citedUrl ?? a.baseUrl ?? null,
      confidence_score: Math.min(1, a.confidenceScore),
      is_rumor: a.isRumor,
      field_path: a.fieldPath,
      value: a.value,
    })),
    community_notes: notesRaw.map((n) => ({
      id: n.id,
      body: n.body,
      source_name: n.sourceName,
      is_official: n.sourceType === "official",
    })),
    last_verified_at: car.lastVerifiedAt ? car.lastVerifiedAt.toISOString() : null,
    th_explanation,
  };
}

/** Server-driven TH narrative endpoint (same payload fragment). */
export async function getThExplanation(id: string) {
  const detail = await getCarById(id);
  if (!detail) return null;
  return {
    car_id: id,
    treasure_hunt_type: detail.treasure_hunt_type,
    th_explanation: detail.th_explanation,
    confidence_score: detail.confidence_score,
  };
}
