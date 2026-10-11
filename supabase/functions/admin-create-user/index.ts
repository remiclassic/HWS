// Create a new user with a role assigned at creation time.
// Admin-only. Pre-confirms the email so the new account can sign in immediately.
import { requireAdminCtx, jsonResponse } from "../_shared/admin.ts";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const { admin } = await requireAdminCtx(req);
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      role?: "admin" | "user";
      display_name?: string;
    };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const role = body.role ?? "user";

    if (!email.includes("@")) return jsonResponse({ error: "Valid email required" }, 400);
    if (password.length < 10) return jsonResponse({ error: "Password must be at least 10 characters" }, 400);
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return jsonResponse({ error: "Password must include upper, lower, and a digit" }, 400);
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: body.display_name ? { display_name: body.display_name } : undefined,
    });
    if (error || !data.user) return jsonResponse({ error: error?.message ?? "createUser failed" }, 500);

    // The on_auth_user_created trigger has already inserted user_profiles + user_gamification.
    // Patch in the admin flag and display_name if requested.
    const update: Record<string, unknown> = {};
    if (role === "admin") update["is_admin"] = true;
    if (body.display_name) update["display_name"] = body.display_name.slice(0, 32);
    if (Object.keys(update).length > 0) {
      const { error: updErr } = await admin
        .from("user_profiles")
        .update(update)
        .eq("user_id", data.user.id);
      if (updErr) return jsonResponse({ error: updErr.message }, 500);
    }

    return jsonResponse({
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role,
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
