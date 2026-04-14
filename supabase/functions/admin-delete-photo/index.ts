// Remove a user's garage photo (Storage object + DB row). Used to purge offensive uploads.
import { requireAdminCtx, jsonResponse } from "../_shared/admin.ts";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const { admin } = await requireAdminCtx(req);
    const { photo_id } = (await req.json()) as { photo_id?: string };
    if (!photo_id) return jsonResponse({ error: "photo_id required" }, 400);

    const { data: row, error: selErr } = await admin
      .from("user_car_photos")
      .select("storage_path")
      .eq("id", photo_id)
      .single();
    if (selErr || !row) return jsonResponse({ error: selErr?.message ?? "not found" }, 404);

    const del = await admin.from("user_car_photos").delete().eq("id", photo_id);
    if (del.error) return jsonResponse({ error: del.error.message }, 500);
    await admin.storage.from("user-car-photos").remove([row.storage_path]);
    return jsonResponse({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
