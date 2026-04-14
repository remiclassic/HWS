// Paginated catalog listing for the admin dashboard.
import { requireAdminCtx, jsonResponse } from "../_shared/admin.ts";

Deno.serve(async (req) => {
  try {
    if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
    const { admin } = await requireAdminCtx(req);
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const perPage = Math.min(100, Math.max(10, Number(url.searchParams.get("perPage") ?? "50")));
    const search = url.searchParams.get("q")?.trim() ?? "";

    let q = admin
      .from("canonical_cars")
      .select("id, casting_name, year, series, line_type, treasure_hunt_type, last_verified_at", { count: "exact" });
    if (search) q = q.ilike("casting_name", `%${search}%`);
    q = q.order("casting_name").range((page - 1) * perPage, page * perPage - 1);

    const { data, error, count } = await q;
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ cars: data ?? [], total: count ?? 0, page, per_page: perPage });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
