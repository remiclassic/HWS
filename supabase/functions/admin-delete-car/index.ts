// Delete a canonical car. Cascades to variations, barcodes, images, reports, and
// any user_cars rows that reference it (per the FK on_delete = cascade).
import { requireAdminCtx, jsonResponse } from "../_shared/admin.ts";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const { admin } = await requireAdminCtx(req);
    const { car_id } = (await req.json()) as { car_id?: string };
    if (!car_id) return jsonResponse({ error: "car_id required" }, 400);
    const { error } = await admin.from("canonical_cars").delete().eq("id", car_id);
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
