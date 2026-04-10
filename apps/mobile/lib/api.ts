import type {
  CarDetailDto,
  CarsListResponse,
  CarsQuery,
  CreateCarDataReportBody,
  CreateUserCarBody,
  LeaderboardResponse,
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
  authTokenResponseSchema,
  carDetailSchema,
  carsListResponseSchema,
  garagePhotoUploadResponseSchema,
  leaderboardResponseSchema,
  meGamificationResponseSchema,
  meSettingsResponseSchema,
  publicCollectorProfileSchema,
  userCarSchema,
} from "@hotwheels/shared";
import { getApiBase } from "./config";
import { getToken } from "./authStorage";

const REQUEST_TIMEOUT_MS = 25_000;

async function request<T>(
  path: string,
  init?: RequestInit & { params?: Record<string, string | number | undefined> },
  skipAuth = false,
): Promise<T> {
  const url = new URL(path, `${getApiBase()}/`);
  if (init?.params) {
    for (const [k, v] of Object.entries(init.params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (init?.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (!skipAuth) {
    const t = await getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const timeout = new AbortController();
  const tid = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      ...init,
      headers,
      signal: timeout.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`Request timed out (${REQUEST_TIMEOUT_MS / 1000}s) — check API is running and EXPO_PUBLIC_API_URL`);
    }
    throw e;
  } finally {
    clearTimeout(tid);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : res.statusText);
  }
  return data as T;
}

export async function authAnonymous(): Promise<{ token: string; user_id: string }> {
  const raw = await request<unknown>("/auth/anonymous", { method: "POST" }, true);
  return authTokenResponseSchema.parse(raw);
}

export async function fetchCars(query: CarsQuery): Promise<CarsListResponse> {
  const raw = await request<unknown>("/cars", {
    params: {
      q: query.q,
      year: query.year,
      series: query.series,
      line_type: query.line_type,
      treasure_hunt_type: query.treasure_hunt_type,
      sku: query.sku,
      model_number: query.model_number,
      limit: query.limit,
      offset: query.offset,
    },
  }, true);
  return carsListResponseSchema.parse(raw);
}

export async function fetchCar(id: string): Promise<CarDetailDto> {
  const raw = await request<unknown>(`/cars/${id}`, {}, true);
  return carDetailSchema.parse(raw);
}

export async function submitCarDataReport(
  carId: string,
  body: CreateCarDataReportBody,
): Promise<{ id: string }> {
  return request<{ id: string }>(`/cars/${carId}/reports`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchThExplanation(id: string): Promise<{
  car_id: string;
  treasure_hunt_type: string;
  th_explanation: { summary: string; markers: string[] } | null;
  confidence_score: number;
}> {
  return request(`/cars/${id}/th-explanation`, {}, true);
}

export async function fetchGarage(): Promise<{ items: UserCarDto[] }> {
  const raw = await request<unknown>("/me/garage");
  const items = (raw as { items: unknown[] }).items.map((i) => userCarSchema.parse(i));
  return { items };
}

export async function addToGarage(body: CreateUserCarBody): Promise<UserCarDto> {
  const raw = await request<unknown>("/me/garage", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return userCarSchema.parse(raw);
}

export async function patchGarageItem(id: string, body: PatchUserCarBody): Promise<UserCarDto> {
  const raw = await request<unknown>(`/me/garage/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return userCarSchema.parse(raw);
}

export async function deleteGarageItem(id: string): Promise<void> {
  await request<unknown>(`/me/garage/${id}`, { method: "DELETE" });
}

export async function uploadGarageItemPhoto(
  garageItemId: string,
  localUri: string,
  mimeType: string,
): Promise<UserCarPhotoDto> {
  const url = new URL(`me/garage/${garageItemId}/photos`, `${getApiBase().replace(/\/$/, "")}/`);
  const token = await getToken();
  const form = new FormData();
  const name =
    mimeType.includes("png") ? "photo.png" : mimeType.includes("webp") ? "photo.webp" : "photo.jpg";
  form.append("photo", {
    uri: localUri,
    name,
    type: mimeType,
  } as unknown as Blob);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url.toString(), { method: "POST", headers, body: form });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : res.statusText);
  }
  return garagePhotoUploadResponseSchema.parse(data).photo;
}

export async function deleteGarageItemPhoto(garageItemId: string, photoId: string): Promise<void> {
  await request<unknown>(`/me/garage/${garageItemId}/photos/${photoId}`, { method: "DELETE" });
}

export async function fetchMeSettings(): Promise<MeSettingsResponse> {
  const raw = await request<unknown>("/me/settings");
  return meSettingsResponseSchema.parse(raw);
}

export async function patchNotificationPreferences(
  body: PatchNotificationPrefsBody,
): Promise<MeSettingsResponse> {
  const raw = await request<unknown>("/me/notification-preferences", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return meSettingsResponseSchema.parse(raw);
}

export async function registerPushToken(body: RegisterPushTokenBody): Promise<void> {
  await request<unknown>("/me/push-token", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function unregisterPushTokens(): Promise<void> {
  await request<unknown>("/me/push-token", { method: "DELETE" });
}

export async function fetchGamification(): Promise<MeGamificationResponse> {
  const raw = await request<unknown>("/me/gamification");
  return meGamificationResponseSchema.parse(raw);
}

export async function patchLeaderboardProfile(
  body: PatchLeaderboardProfileBody,
): Promise<MeGamificationResponse> {
  const raw = await request<unknown>("/me/leaderboard-profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return meGamificationResponseSchema.parse(raw);
}

export async function recordGamificationScan(): Promise<void> {
  await request<unknown>("/me/gamification/record-scan", { method: "POST" });
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardResponse> {
  const raw = await request<unknown>("/leaderboard", { params: { limit } });
  return leaderboardResponseSchema.parse(raw);
}

export async function fetchPublicCollectorProfile(slug: string): Promise<PublicCollectorProfile> {
  const raw = await request<unknown>(`/collectors/${encodeURIComponent(slug)}`, {}, true);
  return publicCollectorProfileSchema.parse(raw);
}

