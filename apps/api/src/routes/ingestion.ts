import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  parseManualCarPayload,
  upsertManualCanonicalCar,
} from "../ingestion/manualImport.js";
import { listCarDataReportsInternal } from "../services/carReports.service.js";
import { notifyWantListForCatalogUpdates } from "../services/wantListPush.service.js";

function requireInternalKey(
  req: FastifyRequest,
  reply: FastifyReply,
): boolean {
  const expected = process.env["INTERNAL_IMPORT_KEY"];
  if (!expected) {
    reply.status(503).send({ error: "Import disabled (INTERNAL_IMPORT_KEY not set)" });
    return false;
  }
  const key = req.headers["x-internal-key"];
  if (typeof key !== "string" || key !== expected) {
    reply.status(401).send({ error: "Unauthorized" });
    return false;
  }
  return true;
}

const bulkBodySchema = z.object({
  cars: z.array(z.unknown()).min(1).max(500),
  stop_on_error: z.boolean().optional().default(false),
});

const listReportsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function registerIngestionRoutes(app: FastifyInstance) {
  app.get("/internal/car-reports", async (req, reply) => {
    if (!requireInternalKey(req, reply)) return;
    const parsed = listReportsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      reply.status(400).send({ error: parsed.error.flatten() });
      return;
    }
    const rows = await listCarDataReportsInternal(parsed.data.limit, parsed.data.offset);
    reply.send({
      items: rows.map((r) => ({
        id: r.id,
        user_id: r.userId,
        car_id: r.carId,
        message: r.message,
        field_path: r.fieldPath,
        status: r.status,
        created_at: r.createdAt.toISOString(),
      })),
    });
  });

  app.post("/internal/import/manual-car", async (req, reply) => {
    if (!requireInternalKey(req, reply)) return;
    try {
      const payload = parseManualCarPayload(req.body);
      const id = await upsertManualCanonicalCar(payload);
      void notifyWantListForCatalogUpdates([{ carId: id, castingName: payload.casting_name }]);
      reply.send({ ok: true, car_id: id });
    } catch (e) {
      reply.status(400).send({
        error: e instanceof Error ? e.message : "Invalid payload",
      });
    }
  });

  /** Bulk upsert; use for catalog refresh jobs. Each item uses the same shape as `manual-car`. */
  app.post("/internal/import/manual-cars-bulk", async (req, reply) => {
    if (!requireInternalKey(req, reply)) return;
    const parsed = bulkBodySchema.safeParse(req.body);
    if (!parsed.success) {
      reply.status(400).send({ error: parsed.error.flatten() });
      return;
    }
    const { cars: items, stop_on_error: stopOnError } = parsed.data;
    const results: { index: number; ok: boolean; car_id?: string; error?: string }[] = [];
    const touched: { carId: string; castingName: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const payload = parseManualCarPayload(items[i]);
        const car_id = await upsertManualCanonicalCar(payload);
        touched.push({ carId: car_id, castingName: payload.casting_name });
        results.push({ index: i, ok: true, car_id });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid payload";
        results.push({ index: i, ok: false, error: msg });
        if (stopOnError) {
          reply.status(400).send({
            ok: false,
            stopped_at: i,
            error: msg,
            partial_results: results,
          });
          return;
        }
      }
    }
    void notifyWantListForCatalogUpdates(touched);
    reply.send({
      ok: true,
      total: items.length,
      imported: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  });
}
