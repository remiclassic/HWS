// Admin destructive actions on a user. POST { user_id, action, until_iso? }
// Actions: "ban" | "unban" | "delete"
import { requireAdminCtx, jsonResponse } from "../_shared/admin.ts";

const VALID = new Set(["ban", "unban", "delete"]);

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const { admin, userId: callerId } = await requireAdminCtx(req);
    const body = (await req.json()) as { user_id?: string; action?: string; until_iso?: string };
    const targetId = body.user_id ?? "";
    const action = body.action ?? "";
    if (!targetId || !VALID.has(action)) return jsonResponse({ error: "Bad request" }, 400);
    if (targetId === callerId) return jsonResponse({ error: "You cannot act on your own admin account" }, 400);

    if (action === "delete") {
      // Purge Storage photos first (cascades don't reach the bucket).
      const { data: photoRows } = await admin
        .from("user_car_photos")
        .select("storage_path, user_cars!inner(user_id)")
        .eq("user_cars.user_id", targetId);
      const paths = (photoRows ?? []).map((r: { storage_path: string }) => r.storage_path);
      if (paths.length > 0) await admin.storage.from("user-car-photos").remove(paths);
      const { error } = await admin.auth.admin.deleteUser(targetId);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ ok: true });
    }

    if (action === "ban") {
      const until = body.until_iso ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      // supabase-js accepts a `ban_duration` string like "24h" OR you can pass banned_until.
      // The admin API currently exposes `ban_duration`; we translate from ISO to an approximate duration.
      const hours = Math.max(1, Math.round((new Date(until).getTime() - Date.now()) / 3_600_000));
      const { error } = await admin.auth.admin.updateUserById(targetId, {
        // deno-lint-ignore no-explicit-any
        ban_duration: `${hours}h`,
      } as any);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ ok: true, banned_for_hours: hours });
    }

    // unban
    const { error } = await admin.auth.admin.updateUserById(targetId, {
      // deno-lint-ignore no-explicit-any
      ban_duration: "none",
    } as any);
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
