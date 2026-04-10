import type {
  CarDetailDto,
  CarsListResponse,
  CarsQuery,
  CreateUserCarBody,
  PatchUserCarBody,
  UserCarDto,
  UserCarPhotoDto,
} from "@hotwheels/shared";
import {
  authTokenResponseSchema,
  carDetailSchema,
  carsListResponseSchema,
  garagePhotoUploadResponseSchema,
  userCarSchema,
} from "@hotwheels/shared";
import { getApiBase } from "./config";
import { getToken } from "./authStorage";

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
  const res = await fetch(url.toString(), {
    ...init,
    headers,
  });
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
