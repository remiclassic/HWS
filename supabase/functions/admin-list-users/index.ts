// Paginated user list for the admin dashboard. Joins auth.users (via admin.listUsers)
// with public.user_profiles + per-user counts so the UI can show a single table.
import { requireAdminCtx, jsonResponse } from "../_shared/admin.ts";

Deno.serve(async (req) => {
  try {
    if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
    const { admin } = await requireAdminCtx(req);
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const perPage = Math.min(100, Math.max(10, Number(url.searchParams.get("perPage") ?? "25")));

    const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ page, perPage });
    if (listErr) return jsonResponse({ error: listErr.message }, 500);

    const userIds = listData.users.map((u) => u.id);
    const [profilesRes, garageCountsRes, photoCountsRes] = await Promise.all([
      admin.from("user_profiles").select("user_id, display_name, is_admin, created_at").in("user_id", userIds),
      admin.from("user_cars").select("user_id").in("user_id", userIds),
      admin
        .from("user_car_photos")
        .select("user_car_id, user_cars!inner(user_id)")
        .in("user_cars.user_id", userIds),
    ]);

    const profiles = new Map(
      (profilesRes.data ?? []).map((p: { user_id: string; display_name: string | null; is_admin: boolean }) => [p.user_id, p]),
    );
    const garageCount = new Map<string, number>();
    for (const r of garageCountsRes.data ?? []) {
      garageCount.set(r.user_id, (garageCount.get(r.user_id) ?? 0) + 1);
    }
    const photoCount = new Map<string, number>();
    for (const r of (photoCountsRes.data ?? []) as Array<{ user_cars: { user_id: string } }>) {
      const uid = r.user_cars.user_id;
      photoCount.set(uid, (photoCount.get(uid) ?? 0) + 1);
    }

    const users = listData.users.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      banned_until: (u as unknown as { banned_until?: string | null }).banned_until ?? null,
      is_anonymous: (u as unknown as { is_anonymous?: boolean }).is_anonymous ?? false,
      display_name: profiles.get(u.id)?.display_name ?? null,
      is_admin: profiles.get(u.id)?.is_admin ?? false,
      garage_count: garageCount.get(u.id) ?? 0,
      photo_count: photoCount.get(u.id) ?? 0,
    }));

    return jsonResponse({
      users,
      page,
      per_page: perPage,
      total: listData.total ?? users.length,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
