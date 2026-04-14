// Update a car data report status.
import { requireAdminCtx, jsonResponse } from "../_shared/admin.ts";

const ALLOWED = new Set(["open", "triaged", "closed"]);

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const { admin } = await requireAdminCtx(req);
    const { report_id, status } = (await req.json()) as { report_id?: string; status?: string };
    if (!report_id || !status || !ALLOWED.has(status)) {
      return jsonResponse({ error: "Bad request" }, 400);
    }
    const { error } = await admin
      .from("car_data_reports")
      .update({ status })
      .eq("id", report_id);
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
