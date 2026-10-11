// End-to-end test of the achievements sync (migration 20261011000000_achievements_sync)
// against the running local Supabase stack. Same setup as rls.test.ts: export
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY from `supabase status`.
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// Relative on purpose: this workspace doesn't depend on @hotwheels/shared, and the
// parity check below wants the source catalog, not a built copy.
import { ACHIEVEMENT_CATALOG } from "../../packages/shared/src/gamification";

const API_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!API_URL || !SERVICE_ROLE || !ANON_KEY) {
  throw new Error(
    "Achievement tests require SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY. " +
      "Run `npx supabase status` and export the values before `npm run test:rls`.",
  );
}

/** Mirrors XP_PER_SCAN in supabase/functions/record-scan and the constant in the migration. */
const XP_PER_SCAN = 5;

const admin = createClient(API_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const xpOf = (id: string) => {
  const def = ACHIEVEMENT_CATALOG.find((a) => a.id === id);
  if (!def) throw new Error(`unknown achievement ${id}`);
  return def.xp;
};

async function createUser(email: string, password: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");
  return data.user.id;
}

async function userClient(email: string, password: string): Promise<SupabaseClient> {
  const c = createClient(API_URL as string, ANON_KEY as string, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error ?? new Error("signIn returned no session");
  return c;
}

async function carIdWhere(column: "treasure_hunt_type" | "line_type", value: string, not?: string) {
  let q = admin.from("canonical_cars").select("id").eq(column, value);
  if (not) q = q.neq("id", not);
  const { data, error } = await q.limit(1).single();
  if (error || !data) throw error ?? new Error(`seed has no car with ${column}=${value}`);
  return data.id as string;
}

async function progress(userId: string) {
  const [gam, ach] = await Promise.all([
    admin.from("user_gamification").select("total_xp, barcode_scan_count").eq("user_id", userId).single(),
    admin.from("user_achievements").select("achievement_id").eq("user_id", userId),
  ]);
  if (gam.error || !gam.data) throw gam.error ?? new Error("no gamification row");
  return {
    xp: gam.data.total_xp as number,
    scans: gam.data.barcode_scan_count as number,
    ids: (ach.data ?? []).map((r) => r.achievement_id as string).sort(),
  };
}

const password = "Secret-PW-1234";
const email = `ach-${Date.now()}@hotwheels.test`;
let userId = "";
let user: SupabaseClient;
let thCarId = "";
let plainCarId = "";

describe("achievement definitions", () => {
  it("match ACHIEVEMENT_CATALOG in packages/shared", async () => {
    const { data, error } = await admin.from("achievement_definitions").select("id, rule_kind, threshold, xp");
    expect(error).toBeNull();
    const fromDb = (data ?? []).map((d) => `${d.id}|${d.rule_kind}|${d.threshold}|${d.xp}`).sort();
    const fromCode = ACHIEVEMENT_CATALOG.map((a) => `${a.id}|${a.rule.kind}|${a.rule.n}|${a.xp}`).sort();
    expect(fromDb).toEqual(fromCode);
  });
});

describe("achievements sync", () => {
  beforeAll(async () => {
    userId = await createUser(email, password);
    user = await userClient(email, password);
    thCarId = await carIdWhere("treasure_hunt_type", "TH");
    plainCarId = await carIdWhere("treasure_hunt_type", "None");
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("starts with nothing unlocked", async () => {
    expect(await progress(userId)).toEqual({ xp: 0, scans: 0, ids: [] });
  });

  it("unlocks on the first garage save, written by the user's own insert", async () => {
    const ins = await user.from("user_cars").insert({ user_id: userId, car_id: plainCarId, status: "Want" });
    expect(ins.error).toBeNull();
    const p = await progress(userId);
    expect(p.ids).toEqual(["garage_first"]);
    expect(p.xp).toBe(xpOf("garage_first"));
  });

  it("unlocks the Treasure Hunt achievement for an Owned TH casting", async () => {
    const ins = await user.from("user_cars").insert({ user_id: userId, car_id: thCarId, status: "Owned" });
    expect(ins.error).toBeNull();
    const p = await progress(userId);
    expect(p.ids).toEqual(["garage_first", "th_first"]);
    expect(p.xp).toBe(xpOf("garage_first") + xpOf("th_first"));
  });

  it("rolls an achievement back when the status no longer qualifies", async () => {
    const upd = await user.from("user_cars").update({ status: "Want" }).eq("user_id", userId).eq("car_id", thCarId);
    expect(upd.error).toBeNull();
    const p = await progress(userId);
    expect(p.ids).toEqual(["garage_first"]);
    expect(p.xp).toBe(xpOf("garage_first"));
  });

  it("leaves progress alone for edits no rule depends on", async () => {
    const before = await progress(userId);
    const upd = await user.from("user_cars").update({ quantity: 3, notes: "spare" }).eq("user_id", userId);
    expect(upd.error).toBeNull();
    expect(await progress(userId)).toEqual(before);
  });

  it("counts garage photos, and un-counts them when removed", async () => {
    const { data: row } = await admin
      .from("user_cars")
      .select("id")
      .eq("user_id", userId)
      .eq("car_id", plainCarId)
      .single();
    const photoId = randomUUID();
    const ins = await admin.from("user_car_photos").insert({
      id: photoId,
      user_car_id: row?.id,
      storage_path: `${userId}/${photoId}.jpg`,
      mime_type: "image/jpeg",
      byte_size: 1,
    });
    expect(ins.error).toBeNull();
    expect((await progress(userId)).ids).toEqual(["garage_first", "photo_first"]);

    const del = await admin.from("user_car_photos").delete().eq("id", photoId);
    expect(del.error).toBeNull();
    expect((await progress(userId)).ids).toEqual(["garage_first"]);
  });

  it("adds scan XP and scan achievements when record-scan bumps the counter", async () => {
    // Same write the record-scan Edge Function performs with the service role.
    const before = await progress(userId);
    const upd = await admin
      .from("user_gamification")
      .update({ barcode_scan_count: before.scans + 1, total_xp: before.xp + XP_PER_SCAN })
      .eq("user_id", userId);
    expect(upd.error).toBeNull();
    const p = await progress(userId);
    expect(p.ids).toEqual(["garage_first", "scan_1"]);
    expect(p.xp).toBe(xpOf("garage_first") + xpOf("scan_1") + XP_PER_SCAN);
  });

  it("drops garage achievements when the garage is emptied, keeping scan progress", async () => {
    const del = await user.from("user_cars").delete().eq("user_id", userId);
    expect(del.error).toBeNull();
    const p = await progress(userId);
    expect(p.ids).toEqual(["scan_1"]);
    expect(p.xp).toBe(xpOf("scan_1") + XP_PER_SCAN);
  });

  it("does not let a user grant themselves achievements or XP", async () => {
    const before = await progress(userId);
    const ins = await user.from("user_achievements").insert({ user_id: userId, achievement_id: "owned_100" });
    expect(ins.error).not.toBeNull();
    await user.from("user_gamification").update({ total_xp: 99_999 }).eq("user_id", userId);
    const rpc = await user.rpc("sync_user_achievements", { p_user_id: userId });
    expect(rpc.error).not.toBeNull();
    expect(await progress(userId)).toEqual(before);
  });
});

describe("account deletion with achievements", () => {
  it("still succeeds while the cascade fires the sync triggers", async () => {
    const mail = `ach-del-${Date.now()}@hotwheels.test`;
    const id = await createUser(mail, password);
    const client = await userClient(mail, password);
    const carId = await carIdWhere("treasure_hunt_type", "None");
    const ins = await client.from("user_cars").insert({ user_id: id, car_id: carId });
    expect(ins.error).toBeNull();
    expect((await progress(id)).ids).toEqual(["garage_first"]);

    const del = await admin.auth.admin.deleteUser(id);
    expect(del.error).toBeNull();
    const { data } = await admin.from("user_achievements").select("achievement_id").eq("user_id", id);
    expect(data ?? []).toHaveLength(0);
  });
});
