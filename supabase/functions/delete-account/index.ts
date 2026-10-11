// Permanently delete the caller's auth.users row. Cascades remove profile + garage + photos.
// Service-role is required for auth.admin.deleteUser — the mobile anon key cannot do this.
import { requireAuthCtx, jsonResponse } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const { userId, admin } = await requireAuthCtx(req);

    // Best-effort: purge the user's photo bucket (Storage rows don't cascade automatically).
    const { data: photoRows } = await admin
      .from("user_car_photos")
      .select("storage_path, user_cars!inner(user_id)")
      .eq("user_cars.user_id", userId);
    const paths = (photoRows ?? []).map((r: { storage_path: string }) => r.storage_path);
    if (paths.length > 0) {
      await admin.storage.from("user-car-photos").remove(paths);
    }

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return jsonResponse({ error: error.message }, 500);

    return jsonResponse({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
