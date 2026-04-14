// End-to-end RLS test against the running local Supabase stack.
// Requires `npx supabase start` to be running (db:54322, api:54321).
//
// Strategy:
//   1. Create two fresh users via the Admin API (service-role key).
//   2. Sign in as each user to get a user-scoped supabase client.
//   3. Insert garage rows as user A and assert user B cannot read or update them.
//   4. Assert catalog tables are readable by both, and writes are rejected.
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Keys are read from the environment so this file never contains credential-shaped
// literals (GitHub push protection rejects the CLI's published default key by pattern).
// Populate from `supabase status`:
//   export SUPABASE_URL="$(npx supabase status --output json | jq -r .API_URL)"
//   export SUPABASE_SERVICE_ROLE_KEY="$(npx supabase status --output json | jq -r .SERVICE_ROLE_KEY)"
//   export SUPABASE_ANON_KEY="$(npx supabase status --output json | jq -r .ANON_KEY)"
// Or source `supabase/tests/.env.local` (git-ignored) before running vitest.
const API_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!API_URL || !SERVICE_ROLE || !ANON_KEY) {
  throw new Error(
    "RLS tests require SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY. " +
      "Run `npx supabase status` and export the values before `npm run test:rls`.",
  );
}

const admin = createClient(API_URL, SERVICE_ROLE, { auth: { persistSession: false } });

async function createUser(email: string, password: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");
  return data.user.id;
}

async function userClient(email: string, password: string) {
  const c = createClient(API_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error ?? new Error("signIn returned no session");
  return c;
}

let userA = "";
let userB = "";
let carId = "";
const emailA = `a-${Date.now()}@hotwheels.test`;
const emailB = `b-${Date.now()}@hotwheels.test`;
const password = "Secret-PW-1234";

describe("RLS isolation", () => {
  beforeAll(async () => {
    userA = await createUser(emailA, password);
    userB = await createUser(emailB, password);
    const { data, error } = await admin.from("canonical_cars").select("id").limit(1).single();
    if (error || !data) throw error ?? new Error("seed canonical_cars missing");
    carId = data.id;
  });

  afterAll(async () => {
    if (userA) await admin.auth.admin.deleteUser(userA);
    if (userB) await admin.auth.admin.deleteUser(userB);
  });

  it("signup trigger created profile + gamification rows", async () => {
    const { data: profile } = await admin.from("user_profiles").select("user_id").eq("user_id", userA).single();
    expect(profile?.user_id).toBe(userA);
    const { data: gam } = await admin.from("user_gamification").select("user_id").eq("user_id", userA).single();
    expect(gam?.user_id).toBe(userA);
  });

  it("user can read catalog (canonical_cars)", async () => {
    const a = await userClient(emailA, password);
    const { data, error } = await a.from("canonical_cars").select("id").limit(1);
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });

  it("user cannot insert into catalog (write denied by RLS)", async () => {
    const a = await userClient(emailA, password);
    const { error } = await a
      .from("canonical_cars")
      .insert({ casting_name: "Hacked", year: 2026 });
    expect(error).not.toBeNull();
  });

  it("user A cannot read user B's garage rows", async () => {
    const a = await userClient(emailA, password);
    const b = await userClient(emailB, password);

    const insA = await a.from("user_cars").insert({ car_id: carId, user_id: userA }).select("id").single();
    expect(insA.error).toBeNull();
    expect(insA.data?.id).toBeDefined();

    const { data: visibleToB } = await b.from("user_cars").select("id").eq("user_id", userA);
    expect(visibleToB ?? []).toHaveLength(0);
  });

  it("user A cannot update user B's garage rows", async () => {
    const a = await userClient(emailA, password);
    const b = await userClient(emailB, password);
    const ins = await b.from("user_cars").insert({ car_id: carId, user_id: userB }).select("id").single();
    expect(ins.error).toBeNull();
    const targetId = ins.data?.id as string;

    const upd = await a.from("user_cars").update({ quantity: 99 }).eq("id", targetId).select("id");
    // Supabase returns an empty array for update-but-RLS-filtered (no rows matched).
    expect(upd.data ?? []).toHaveLength(0);
  });

  it("user_profiles row is readable by owner", async () => {
    const a = await userClient(emailA, password);
    const { data, error } = await a.from("user_profiles").select("user_id").eq("user_id", userA).single();
    expect(error).toBeNull();
    expect(data?.user_id).toBe(userA);
  });

  it("user_profiles row of opted-out user is NOT readable by others", async () => {
    const a = await userClient(emailA, password);
    const { data } = await a.from("user_profiles").select("user_id").eq("user_id", userB);
    expect(data ?? []).toHaveLength(0);
  });
});
