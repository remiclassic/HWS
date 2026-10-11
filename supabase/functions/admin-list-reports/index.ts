// List car data reports for triage. Filterable by status.
import { requireAdminCtx, jsonResponse } from "../_shared/admin.ts";

Deno.serve(async (req) => {
  try {
    if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
    const { admin } = await requireAdminCtx(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "open";

    let q = admin
      .from("car_data_reports")
      .select(
        `id, user_id, car_id, message, field_path, status, created_at,
         canonical_cars(casting_name, year)`,
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return jsonResponse({ error: error.message }, 500);

    return jsonResponse({ reports: data ?? [] });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
