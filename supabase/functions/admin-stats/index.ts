// Aggregate dashboard stats for the admin UI.
import { requireAdminCtx, jsonResponse } from "../_shared/admin.ts";

Deno.serve(async (req) => {
  try {
    if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
    const { admin } = await requireAdminCtx(req);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [usersTotal, users24h, users7d, garageTotal, photosTotal, reportsOpen, admins] = await Promise.all([
      admin.from("user_profiles").select("user_id", { count: "exact", head: true }),
      admin.from("user_profiles").select("user_id", { count: "exact", head: true }).gte("created_at", since24h),
      admin.from("user_profiles").select("user_id", { count: "exact", head: true }).gte("created_at", since7d),
      admin.from("user_cars").select("id", { count: "exact", head: true }),
      admin.from("user_car_photos").select("id", { count: "exact", head: true }),
      admin.from("car_data_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      admin.from("user_profiles").select("user_id", { count: "exact", head: true }).eq("is_admin", true),
    ]);

    return jsonResponse({
      users_total: usersTotal.count ?? 0,
      users_new_24h: users24h.count ?? 0,
      users_new_7d: users7d.count ?? 0,
      garage_rows_total: garageTotal.count ?? 0,
      photos_total: photosTotal.count ?? 0,
      reports_open: reportsOpen.count ?? 0,
      admins_total: admins.count ?? 0,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
