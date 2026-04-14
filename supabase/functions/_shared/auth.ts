// Resolve the caller's auth user from the Authorization header using the anon-scoped client.
// Service-role operations then use the admin client created per-function.
// deno-lint-ignore-file no-explicit-any
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

export type Ctx = {
  userId: string;
  user: any;
  admin: SupabaseClient;
};

export async function requireAuthCtx(req: Request): Promise<Ctx> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) throw new Response("Unauthorized", { status: 401 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Response("Server misconfigured", { status: 500 });
  }

  const userScoped = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await userScoped.auth.getUser();
  if (error || !data.user) throw new Response("Unauthorized", { status: 401 });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  return { userId: data.user.id, user: data.user, admin };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
