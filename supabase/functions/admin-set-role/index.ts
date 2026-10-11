// Promote/demote a user to/from admin. Cannot change your own role.
import { requireAdminCtx, jsonResponse } from "../_shared/admin.ts";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const { admin, userId: callerId } = await requireAdminCtx(req);
    const { user_id, is_admin } = (await req.json()) as { user_id?: string; is_admin?: boolean };
    if (!user_id || typeof is_admin !== "boolean") return jsonResponse({ error: "Bad request" }, 400);
    if (user_id === callerId) return jsonResponse({ error: "You cannot change your own role" }, 400);

    const { error } = await admin
      .from("user_profiles")
      .update({ is_admin })
      .eq("user_id", user_id);
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
