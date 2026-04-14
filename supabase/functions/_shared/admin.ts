// Admin-only Edge Function guard. Ensures the caller is authenticated AND has
// is_admin = true on their user_profiles row. Returns the admin's userId + a
// service-role Supabase client for privileged operations.
import { requireAuthCtx, jsonResponse, type Ctx } from "./auth.ts";

export type AdminCtx = Ctx;

export async function requireAdminCtx(req: Request): Promise<AdminCtx> {
  const ctx = await requireAuthCtx(req);
  const { data, error } = await ctx.admin
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", ctx.userId)
    .single();
  if (error || !data?.is_admin) throw new Response("Forbidden", { status: 403 });
  return ctx;
}

export { jsonResponse };
