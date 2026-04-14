// Create a new canonical car (catalog entry). Admin-only.
import { requireAdminCtx, jsonResponse } from "../_shared/admin.ts";

const LINE_TYPES = new Set(["Mainline", "Premium", "RLC", "TeamTransport", "Entertainment", "Other"]);
const TH_TYPES = new Set(["None", "TH", "STH"]);

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const { admin } = await requireAdminCtx(req);
    const body = (await req.json()) as {
      casting_name?: string;
      year?: number;
      series?: string | null;
      line_type?: string;
      treasure_hunt_type?: string;
      model_number?: string | null;
      sku?: string | null;
      barcode?: string | null;
    };
    const casting = body.casting_name?.trim() ?? "";
    const year = Number(body.year);
    const lineType = body.line_type ?? "Mainline";
    const thType = body.treasure_hunt_type ?? "None";

    if (!casting) return jsonResponse({ error: "casting_name required" }, 400);
    if (!Number.isInteger(year) || year < 1960 || year > 2100) {
      return jsonResponse({ error: "year must be an integer between 1960 and 2100" }, 400);
    }
    if (!LINE_TYPES.has(lineType)) return jsonResponse({ error: "invalid line_type" }, 400);
    if (!TH_TYPES.has(thType)) return jsonResponse({ error: "invalid treasure_hunt_type" }, 400);

    const { data, error } = await admin
      .from("canonical_cars")
      .insert({
        casting_name: casting,
        year,
        series: body.series?.trim() || null,
        line_type: lineType,
        treasure_hunt_type: thType,
        model_number: body.model_number?.trim() || null,
        sku: body.sku?.trim() || null,
      })
      .select("id")
      .single();
    if (error || !data) return jsonResponse({ error: error?.message ?? "insert failed" }, 500);

    if (body.barcode?.trim()) {
      const { error: bErr } = await admin
        .from("car_barcodes")
        .insert({ barcode: body.barcode.trim(), car_id: data.id });
      if (bErr) return jsonResponse({ ok: true, id: data.id, barcode_error: bErr.message });
    }

    return jsonResponse({ ok: true, id: data.id });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
