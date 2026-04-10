import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import {
  canonicalCars,
  carImages,
  carSourceAttributions,
  carVariations,
} from "../db/schema.js";
import type { NormalizedCarInput } from "./types.js";

const inputSchema = z.object({
  casting_name: z.string().min(1),
  year: z.number().int(),
  series: z.string().nullable().optional(),
  line_type: z.enum([
    "Mainline",
    "Premium",
    "RLC",
    "TeamTransport",
    "Entertainment",
    "Other",
  ]),
  treasure_hunt_type: z.enum(["None", "TH", "STH"]),
  description: z.string().nullable().optional(),
  model_number: z.string().nullable().optional(),
  case_code: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  source_registry_id: z.string().uuid(),
  attributions: z
    .array(
      z.object({
        field_path: z.string(),
        value: z.string().nullable().optional(),
        confidence_score: z.number().min(0).max(1),
        is_rumor: z.boolean(),
        cited_url: z.string().nullable().optional(),
      }),
    )
    .optional(),
  variations: z
    .array(
      z.object({
        wheels: z.string().nullable().optional(),
        deco: z.string().nullable().optional(),
        region: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .optional(),
  images: z
    .array(
      z.object({
        official_image_url: z.string().min(1),
        attribution_note: z.string().nullable().optional(),
      }),
    )
    .optional(),
});

export function parseManualCarPayload(raw: unknown): NormalizedCarInput {
  const p = inputSchema.parse(raw);
  return {
    casting_name: p.casting_name,
    year: p.year,
    series: p.series ?? null,
    line_type: p.line_type,
    treasure_hunt_type: p.treasure_hunt_type,
    description: p.description ?? null,
    model_number: p.model_number ?? null,
    case_code: p.case_code ?? null,
    sku: p.sku ?? null,
    sourceRegistryId: p.source_registry_id,
    attributions: p.attributions?.map((a) => ({
      field_path: a.field_path,
      value: a.value ?? null,
      confidence_score: a.confidence_score,
      is_rumor: a.is_rumor,
      cited_url: a.cited_url ?? null,
    })),
    variations: p.variations,
    images: p.images,
  };
}

export async function upsertManualCanonicalCar(input: NormalizedCarInput): Promise<string> {
  const matchRows = await db
    .select()
    .from(canonicalCars)
    .where(eq(canonicalCars.castingName, input.casting_name))
    .limit(1);
  const match = matchRows[0];

  let carId: string;
  if (match) {
    carId = match.id;
    await db
      .update(canonicalCars)
      .set({
        year: input.year,
        series: input.series ?? null,
        lineType: input.line_type,
        treasureHuntType: input.treasure_hunt_type,
        description: input.description ?? null,
        modelNumber: input.model_number ?? null,
        caseCode: input.case_code ?? null,
        sku: input.sku ?? null,
        lastVerifiedAt: new Date(),
      })
      .where(eq(canonicalCars.id, carId));
  } else {
    const [inserted] = await db
      .insert(canonicalCars)
      .values({
        castingName: input.casting_name,
        year: input.year,
        series: input.series ?? null,
        lineType: input.line_type,
        treasureHuntType: input.treasure_hunt_type,
        description: input.description ?? null,
        modelNumber: input.model_number ?? null,
        caseCode: input.case_code ?? null,
        sku: input.sku ?? null,
        lastVerifiedAt: new Date(),
      })
      .returning({ id: canonicalCars.id });
    if (!inserted) throw new Error("INSERT_CANONICAL_FAILED");
    carId = inserted.id;
  }

  if (input.attributions?.length) {
    await db.delete(carSourceAttributions).where(eq(carSourceAttributions.carId, carId));
    await db.insert(carSourceAttributions).values(
      input.attributions.map((a) => ({
        carId,
        fieldPath: a.field_path,
        value: a.value ?? null,
        sourceId: input.sourceRegistryId,
        confidenceScore: a.confidence_score,
        isRumor: a.is_rumor,
        citedUrl: a.cited_url ?? null,
      })),
    );
  }

  if (input.variations?.length) {
    await db.delete(carVariations).where(eq(carVariations.carId, carId));
    await db.insert(carVariations).values(
      input.variations.map((v) => ({
        carId,
        wheels: v.wheels ?? null,
        deco: v.deco ?? null,
        region: v.region ?? null,
        notes: v.notes ?? null,
      })),
    );
  }

  if (input.images?.length) {
    await db.delete(carImages).where(eq(carImages.carId, carId));
    await db.insert(carImages).values(
      input.images.map((im) => ({
        carId,
        officialImageUrl: im.official_image_url,
        sourceId: input.sourceRegistryId,
        attributionNote: im.attribution_note ?? null,
      })),
    );
  }

  return carId;
}
