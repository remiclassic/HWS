// Supabase-backed client. Function signatures preserved so existing screens are unchanged.
// Anything needing service-role (delete account, XP award on scan, bulk ingestion) calls an
// Edge Function — those are invoked through supabase.functions.invoke(...).
import type {
  CarDetailDto,
  CarListItemDto,
  CarsListResponse,
  CarsQuery,
  CreateCarDataReportBody,
  CreateUserCarBody,
  LeaderboardResponse,
  MeAccountResponse,
  MeExportResponse,
  MeGamificationResponse,
  MeSettingsResponse,
  PatchLeaderboardProfileBody,
  PatchNotificationPrefsBody,
  PatchUserCarBody,
  PublicCollectorProfile,
  RegisterPushTokenBody,
  UserCarDto,
  UserCarPhotoDto,
} from "@hotwheels/shared";
import {
  ACHIEVEMENT_CATALOG,
  achievementDefinitionById,
  carDetailSchema,
  carsListResponseSchema,
  leaderboardResponseSchema,
  levelFromTotalXp,
  meAccountResponseSchema,
  meExportResponseSchema,
  meGamificationResponseSchema,
  meSettingsResponseSchema,
  publicCollectorProfileSchema,
  userCarSchema,
} from "@hotwheels/shared";
import { supabase } from "./supabase";

const PHOTO_BUCKET = "user-car-photos";
const PHOTO_SIGNED_URL_TTL = 60 * 60; // 1h

async function requireUserId(): Promise<string> {
  // getSession() reads the persisted session synchronously once hydrated and is
  // safe during a background token refresh. getUser() round-trips to the server.
  const { data: sess } = await supabase.auth.getSession();
  if (sess.session?.user) return sess.session.user.id;
  // Fall back to the authenticated fetch (handles the edge case where the session
  // was just rehydrated but getSession cache hasn't caught up).
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not signed in");
  return data.user.id;
}

function throwIf<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("No data returned");
  return result.data;
}

async function signPhoto(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, PHOTO_SIGNED_URL_TTL);
  if (error || !data) throw new Error(error?.message ?? "Could not sign photo URL");
  return data.signedUrl;
}

// ---------- Cars ----------

type CanonicalCarRow = {
  id: string;
  casting_name: string;
  year: number;
  series: string | null;
  line_type: CarListItemDto["line_type"];
  treasure_hunt_type: CarListItemDto["treasure_hunt_type"];
  description: string | null;
  model_number: string | null;
  case_code: string | null;
  sku: string | null;
  last_verified_at: string | null;
  car_images: { id: string; official_image_url: string; attribution_note: string | null }[] | null;
};

function toListItem(row: CanonicalCarRow): CarListItemDto {
  return {
    id: row.id,
    casting_name: row.casting_name,
    year: row.year,
    series: row.series,
    line_type: row.line_type,
    treasure_hunt_type: row.treasure_hunt_type,
    confidence_score: row.last_verified_at ? 0.9 : 0.6,
    primary_image_url: row.car_images?.[0]?.official_image_url ?? null,
  };
}

export async function fetchCars(query: CarsQuery): Promise<CarsListResponse> {
  let q = supabase
    .from("canonical_cars")
    .select(
      "id, casting_name, year, series, line_type, treasure_hunt_type, last_verified_at, car_images(official_image_url)",
      { count: "exact" },
    );
  if (query.q) q = q.ilike("casting_name", `%${query.q}%`);
  if (query.year !== undefined) q = q.eq("year", query.year);
  if (query.series) q = q.eq("series", query.series);
  if (query.line_type) q = q.eq("line_type", query.line_type);
  if (query.treasure_hunt_type) q = q.eq("treasure_hunt_type", query.treasure_hunt_type);
  if (query.sku) q = q.eq("sku", query.sku);
  if (query.model_number) q = q.eq("model_number", query.model_number);
  q = q.order("casting_name").range(query.offset, query.offset + query.limit - 1);
  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  const items = (data ?? []).map((r) => toListItem(r as unknown as CanonicalCarRow));
  return carsListResponseSchema.parse({ items, total: count ?? items.length });
}

export async function fetchCar(id: string): Promise<CarDetailDto> {
  const { data, error } = await supabase
    .from("canonical_cars")
    .select(
      `id, casting_name, year, series, line_type, treasure_hunt_type, description,
       model_number, case_code, sku, last_verified_at,
       car_images(id, official_image_url, attribution_note),
       car_variations(id, wheels, deco, region, notes),
       car_community_notes(id, body, source_registry:source_id(name, type)),
       car_source_attributions(
         field_path, value, confidence_score, is_rumor, cited_url,
         source_registry:source_id(id, name, type, base_url)
       )`,
    )
    .eq("id", id)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Car not found");
  const row = data as unknown as CanonicalCarRow & {
    car_variations: { id: string; wheels: string | null; deco: string | null; region: string | null; notes: string | null }[];
    car_community_notes: { id: string; body: string; source_registry: { name: string; type: string } | null }[];
    car_source_attributions: {
      field_path: string;
      value: string | null;
      confidence_score: number;
      is_rumor: boolean;
      cited_url: string | null;
      source_registry: { id: string; name: string; type: "official" | "community"; base_url: string | null } | null;
    }[];
  };
  const avgConfidence =
    row.car_source_attributions.length > 0
      ? row.car_source_attributions.reduce((s, a) => s + a.confidence_score, 0) /
        row.car_source_attributions.length
      : row.last_verified_at
      ? 0.9
      : 0.6;
  const detail: CarDetailDto = {
    ...toListItem(row),
    confidence_score: avgConfidence,
    description: row.description,
    identifiers: { model_number: row.model_number, case_code: row.case_code, sku: row.sku },
    known_variations: row.car_variations ?? [],
    images: (row.car_images ?? []).map((i) => ({
      id: i.id,
      official_image_url: i.official_image_url,
      attribution_note: i.attribution_note,
    })),
    attributions: row.car_source_attributions.map((a) => ({
      source_id: a.source_registry?.id ?? "",
      source_name: a.source_registry?.name ?? "",
      source_type: (a.source_registry?.type ?? "community") as "official" | "community",
      source_url: a.cited_url,
      confidence_score: a.confidence_score,
      is_rumor: a.is_rumor,
      field_path: a.field_path,
      value: a.value,
    })),
    community_notes: row.car_community_notes.map((n) => ({
      id: n.id,
      body: n.body,
      source_name: n.source_registry?.name ?? "",
      is_official: n.source_registry?.type === "official",
    })),
    last_verified_at: row.last_verified_at,
    th_explanation: null,
  };
  return carDetailSchema.parse(detail);
}

export async function submitCarDataReport(
  carId: string,
  body: CreateCarDataReportBody,
): Promise<{ id: string }> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("car_data_reports")
    .insert({ user_id: userId, car_id: carId, message: body.message, field_path: body.field_path ?? null })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not submit report");
  return { id: data.id };
}

export async function fetchThExplanation(id: string): Promise<{
  car_id: string;
  treasure_hunt_type: string;
  th_explanation: { summary: string; markers: string[] } | null;
  confidence_score: number;
}> {
  // TH explanation generation moves to an Edge Function (task #8).
  const { data, error } = await supabase
    .from("canonical_cars")
    .select("id, treasure_hunt_type")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Car not found");
  return { car_id: data.id, treasure_hunt_type: data.treasure_hunt_type, th_explanation: null, confidence_score: 0.6 };
}

// ---------- Garage ----------

type UserCarRow = {
  id: string;
  user_id: string;
  car_id: string;
  status: UserCarDto["status"];
  condition: UserCarDto["condition"];
  quantity: number;
  notes: string | null;
  date_added: string;
  canonical_cars: CanonicalCarRow | null;
  user_car_photos: { id: string; storage_path: string; created_at: string }[] | null;
};

async function userCarFromRow(row: UserCarRow): Promise<UserCarDto> {
  const photos: UserCarPhotoDto[] = [];
  for (const p of row.user_car_photos ?? []) {
    photos.push({ id: p.id, url: await signPhoto(p.storage_path), created_at: p.created_at });
  }
  return userCarSchema.parse({
    id: row.id,
    user_id: row.user_id,
    car_id: row.car_id,
    status: row.status,
    condition: row.condition,
    quantity: row.quantity,
    notes: row.notes,
    date_added: row.date_added,
    car: row.canonical_cars ? toListItem(row.canonical_cars) : undefined,
    photos,
  });
}

export async function fetchGarage(): Promise<{ items: UserCarDto[] }> {
  // Gate on auth so the query isn't fired with a missing/stale session.
  await requireUserId();
  // RLS restricts rows to auth.uid() = user_id, so no explicit filter is needed.
  const { data, error } = await supabase
    .from("user_cars")
    .select(
      `id, user_id, car_id, status, condition, quantity, notes, date_added,
       canonical_cars(id, casting_name, year, series, line_type, treasure_hunt_type, last_verified_at, car_images(official_image_url)),
       user_car_photos(id, storage_path, created_at)`,
    )
    .order("date_added", { ascending: false });
  if (error) throw new Error(`fetchGarage: ${error.message}`);
  const items: UserCarDto[] = [];
  for (const row of (data ?? []) as unknown as UserCarRow[]) {
    try {
      items.push(await userCarFromRow(row));
    } catch (e) {
      // Skip malformed rows (e.g., a photo storage path that 404s during signing)
      // rather than blowing up the whole garage fetch.
      console.warn("[fetchGarage] skipped row", row.id, e);
    }
  }
  return { items };
}

/** Thrown when the car is already in the user's garage. Callers can render this nicely. */
export class AlreadyInGarageError extends Error {
  constructor() {
    super("This car is already in your garage.");
    this.name = "AlreadyInGarageError";
  }
}

export async function addToGarage(body: CreateUserCarBody): Promise<UserCarDto> {
  const userId = await requireUserId();

  // Friendly pre-check — RLS already scopes this to the caller, so if a row exists
  // with the same car_id, it's in THIS user's garage. Cheaper + nicer than catching 23505.
  const existing = await supabase
    .from("user_cars")
    .select("id")
    .eq("car_id", body.car_id)
    .maybeSingle();
  if (existing.data?.id) throw new AlreadyInGarageError();

  const { data, error } = await supabase
    .from("user_cars")
    .insert({
      user_id: userId,
      car_id: body.car_id,
      status: body.status ?? "Owned",
      condition: body.condition ?? "Carded",
      quantity: body.quantity ?? 1,
      notes: body.notes ?? null,
    })
    .select(
      `id, user_id, car_id, status, condition, quantity, notes, date_added,
       canonical_cars(id, casting_name, year, series, line_type, treasure_hunt_type, last_verified_at, car_images(official_image_url)),
       user_car_photos(id, storage_path, created_at)`,
    )
    .single();
  if (error || !data) {
    // Concurrent-write race: someone (maybe the same user on another tab) slipped an
    // insert between our pre-check and our insert. Postgres returns 23505 here.
    if (error && (error.code === "23505" || /duplicate key/i.test(error.message))) {
      throw new AlreadyInGarageError();
    }
    throw new Error(error?.message ?? "Could not add to garage");
  }
  return userCarFromRow(data as unknown as UserCarRow);
}

export async function patchGarageItem(id: string, body: PatchUserCarBody): Promise<UserCarDto> {
  const { data, error } = await supabase
    .from("user_cars")
    .update({
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.condition !== undefined ? { condition: body.condition } : {}),
      ...(body.quantity !== undefined ? { quantity: body.quantity } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    })
    .eq("id", id)
    .select(
      `id, user_id, car_id, status, condition, quantity, notes, date_added,
       canonical_cars(id, casting_name, year, series, line_type, treasure_hunt_type, last_verified_at, car_images(official_image_url)),
       user_car_photos(id, storage_path, created_at)`,
    )
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not update garage item");
  return userCarFromRow(data as unknown as UserCarRow);
}

export async function deleteGarageItem(id: string): Promise<void> {
  const { error } = await supabase.from("user_cars").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- Photos ----------

export async function uploadGarageItemPhoto(
  garageItemId: string,
  localUri: string,
  mimeType: string,
): Promise<UserCarPhotoDto> {
  const userId = await requireUserId();
  const res = await fetch(localUri);
  const blob = await res.blob();
  if (blob.size > 8 * 1024 * 1024) throw new Error("Photo exceeds 8 MB limit");
  const ext =
    mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  // path convention enforced by RLS: <userId>/<photoId>.<ext>
  const photoId = crypto.randomUUID();
  const storagePath = `${userId}/${photoId}.${ext}`;
  const up = await supabase.storage.from(PHOTO_BUCKET).upload(storagePath, blob, {
    contentType: mimeType,
    upsert: false,
  });
  if (up.error) throw new Error(up.error.message);
  const ins = await supabase
    .from("user_car_photos")
    .insert({
      id: photoId,
      user_car_id: garageItemId,
      storage_path: storagePath,
      mime_type: mimeType,
      byte_size: blob.size,
    })
    .select("id, created_at")
    .single();
  if (ins.error || !ins.data) {
    // best-effort cleanup
    await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
    throw new Error(ins.error?.message ?? "Could not save photo record");
  }
  return { id: ins.data.id, url: await signPhoto(storagePath), created_at: ins.data.created_at };
}

export async function deleteGarageItemPhoto(_garageItemId: string, photoId: string): Promise<void> {
  const { data, error } = await supabase
    .from("user_car_photos")
    .select("storage_path")
    .eq("id", photoId)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Photo not found");
  const del = await supabase.from("user_car_photos").delete().eq("id", photoId);
  if (del.error) throw new Error(del.error.message);
  await supabase.storage.from(PHOTO_BUCKET).remove([data.storage_path]);
}

// ---------- Me / settings ----------

export async function fetchMeAccount(): Promise<MeAccountResponse> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error(error?.message ?? "Not signed in");
  return meAccountResponseSchema.parse({ email: data.user.email ?? null });
}

export async function fetchMeSettings(): Promise<MeSettingsResponse> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("notify_want_list_updates")
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not load settings");
  return meSettingsResponseSchema.parse({ notify_want_updates: data.notify_want_list_updates });
}

export async function patchNotificationPreferences(
  body: PatchNotificationPrefsBody,
): Promise<MeSettingsResponse> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ notify_want_list_updates: body.notify_want_updates })
    .eq("user_id", userId)
    .select("notify_want_list_updates")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save settings");
  return meSettingsResponseSchema.parse({ notify_want_updates: data.notify_want_list_updates });
}

export async function registerPushToken(body: RegisterPushTokenBody): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("user_push_tokens")
    .upsert(
      { user_id: userId, expo_push_token: body.expo_push_token, platform: body.platform },
      { onConflict: "expo_push_token" },
    );
  if (error) throw new Error(error.message);
}

export async function unregisterPushTokens(): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("user_push_tokens").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// ---------- Gamification ----------

export async function fetchGamification(): Promise<MeGamificationResponse> {
  const userId = await requireUserId();
  const [gam, prof, ach] = await Promise.all([
    supabase
      .from("user_gamification")
      .select("total_xp, current_streak, longest_streak, barcode_scan_count, last_active_date")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("user_profiles")
      .select("display_name, leaderboard_opt_in, leaderboard_slug")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", userId),
  ]);
  if (gam.error || !gam.data) throw new Error(gam.error?.message ?? "Could not load gamification");
  if (prof.error || !prof.data) throw new Error(prof.error?.message ?? "Could not load profile");
  const unlocked = (ach.data ?? [])
    .map((row) => {
      const def = achievementDefinitionById(row.achievement_id);
      if (!def) return null;
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        unlocked_at: row.unlocked_at,
      };
    })
    .filter((x): x is { id: string; title: string; description: string; unlocked_at: string } => x !== null);
  // Keep the order stable with the catalog so the UI doesn't reshuffle on refetch.
  const order = new Map(ACHIEVEMENT_CATALOG.map((a, i) => [a.id, i]));
  unlocked.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return meGamificationResponseSchema.parse({
    total_xp: gam.data.total_xp,
    level: levelFromTotalXp(gam.data.total_xp),
    current_streak: gam.data.current_streak,
    longest_streak: gam.data.longest_streak,
    barcode_scan_count: gam.data.barcode_scan_count,
    achievements: unlocked,
    display_name: prof.data.display_name,
    leaderboard_opt_in: prof.data.leaderboard_opt_in,
    leaderboard_slug: prof.data.leaderboard_slug,
  });
}

export async function patchLeaderboardProfile(
  body: PatchLeaderboardProfileBody,
): Promise<MeGamificationResponse> {
  const userId = await requireUserId();
  const update: Record<string, unknown> = {};
  if (body.display_name !== undefined) update["display_name"] = body.display_name;
  if (body.leaderboard_opt_in !== undefined) {
    update["leaderboard_opt_in"] = body.leaderboard_opt_in;
    if (body.leaderboard_opt_in) {
      update["leaderboard_slug"] = Math.random().toString(36).slice(2, 12);
    } else {
      update["leaderboard_slug"] = null;
    }
  }
  const { error } = await supabase.from("user_profiles").update(update).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return fetchGamification();
}

export async function recordGamificationScan(): Promise<void> {
  // Awarding XP requires service-role (so users can't edit their own totals).
  // Invoke the `record-scan` Edge Function (task #8). Falls back to a no-op until it's deployed.
  const { error } = await supabase.functions.invoke("record-scan");
  if (error) throw new Error(error.message);
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardResponse> {
  const me = (await supabase.auth.getUser()).data.user?.id ?? null;
  const { data, error } = await supabase
    .from("user_gamification")
    .select(
      `user_id, total_xp,
       user_profiles!inner(display_name, leaderboard_slug, leaderboard_opt_in)`,
    )
    .eq("user_profiles.leaderboard_opt_in", true)
    .order("total_xp", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const entries = (data ?? []).map((r, idx) => {
    const row = r as unknown as {
      user_id: string;
      total_xp: number;
      user_profiles: { display_name: string | null; leaderboard_slug: string | null };
    };
    return {
      rank: idx + 1,
      display_name: row.user_profiles.display_name ?? "Collector",
      level: levelFromTotalXp(row.total_xp),
      total_xp: row.total_xp,
      leaderboard_slug: row.user_profiles.leaderboard_slug ?? "",
      is_you: row.user_id === me,
    };
  });
  return leaderboardResponseSchema.parse({ entries });
}

export async function fetchPublicCollectorProfile(slug: string): Promise<PublicCollectorProfile> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select(
      `user_id, display_name, leaderboard_slug,
       user_gamification!inner(total_xp, current_streak)`,
    )
    .eq("leaderboard_slug", slug)
    .eq("leaderboard_opt_in", true)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Collector not found");
  const row = data as unknown as {
    user_id: string;
    display_name: string | null;
    leaderboard_slug: string | null;
    user_gamification: { total_xp: number; current_streak: number };
  };
  const { count: achievementCount } = await supabase
    .from("user_achievements")
    .select("achievement_id", { count: "exact", head: true })
    .eq("user_id", row.user_id);
  return publicCollectorProfileSchema.parse({
    display_name: row.display_name ?? "Collector",
    leaderboard_slug: row.leaderboard_slug ?? slug,
    level: levelFromTotalXp(row.user_gamification.total_xp),
    total_xp: row.user_gamification.total_xp,
    current_streak: row.user_gamification.current_streak,
    achievement_count: achievementCount ?? 0,
    leaderboard_rank: null,
  });
}

// ---------- Export / delete ----------

export async function fetchMeExport(): Promise<MeExportResponse> {
  const [account, settings, garage] = await Promise.all([fetchMeAccount(), fetchMeSettings(), fetchGarage()]);
  return meExportResponseSchema.parse({
    exported_at: new Date().toISOString(),
    email: account.email,
    notify_want_updates: settings.notify_want_updates,
    garage_items: garage.items,
  });
}

export async function deleteMeAccount(): Promise<void> {
  // Deleting auth.users requires service-role; done via Edge Function (task #8).
  const { error } = await supabase.functions.invoke("delete-account");
  if (error) throw new Error(error.message);
}

// ---------- Deprecated auth shims (use lib/auth.ts instead) ----------

export async function authAnonymous(): Promise<{ token: string; user_id: string }> {
  throw new Error("authAnonymous removed — use signInAnonymouslyDev() from lib/auth.ts");
}
export async function authRegister(): Promise<{ token: string; user_id: string }> {
  throw new Error("authRegister removed — use signUpWithPassword() from lib/auth.ts");
}
export async function authLogin(): Promise<{ token: string; user_id: string }> {
  throw new Error("authLogin removed — use signInWithPassword() from lib/auth.ts");
}
export async function authLinkEmail(): Promise<{ token: string; user_id: string }> {
  throw new Error("authLinkEmail removed — use supabase.auth.updateUser({ email }) flow");
}
