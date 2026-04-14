import { supabase } from "./supabase";

export type AdminStats = {
  users_total: number;
  users_new_24h: number;
  users_new_7d: number;
  garage_rows_total: number;
  photos_total: number;
  reports_open: number;
  admins_total: number;
};

export type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  is_anonymous: boolean;
  display_name: string | null;
  is_admin: boolean;
  garage_count: number;
  photo_count: number;
};

export type AdminPhoto = {
  id: string;
  url: string | null;
  mime_type: string;
  byte_size: number;
  created_at: string;
  user_car_id: string;
  user_id: string;
  casting_name: string;
  year: number;
};

export type AdminReport = {
  id: string;
  user_id: string;
  car_id: string;
  message: string;
  field_path: string | null;
  status: "open" | "triaged" | "closed";
  created_at: string;
  canonical_cars: { casting_name: string; year: number } | null;
};

async function invoke<T>(
  name: string,
  init: { method: "GET" | "POST"; body?: Record<string, unknown> },
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, init);
  if (error) throw new Error(error.message);
  if (data === null) throw new Error(`${name} returned empty body`);
  return data;
}

export const fetchAdminStats = () => invoke<AdminStats>("admin-stats", { method: "GET" });

export const fetchAdminUsers = (page = 1, perPage = 25) =>
  invoke<{ users: AdminUser[]; page: number; per_page: number; total: number }>(
    `admin-list-users?page=${page}&perPage=${perPage}`,
    { method: "GET" },
  );

export const fetchAdminPhotos = (limit = 30) =>
  invoke<{ photos: AdminPhoto[] }>(`admin-list-photos?limit=${limit}`, { method: "GET" });

export const fetchAdminReports = (status: "open" | "triaged" | "closed" | "all" = "open") =>
  invoke<{ reports: AdminReport[] }>(`admin-list-reports?status=${status}`, { method: "GET" });

export const banUser = (userId: string, hours = 720) => {
  const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  return invoke<{ ok: boolean }>("admin-user-action", {
    method: "POST",
    body: { user_id: userId, action: "ban", until_iso: until },
  });
};

export const unbanUser = (userId: string) =>
  invoke<{ ok: boolean }>("admin-user-action", {
    method: "POST",
    body: { user_id: userId, action: "unban" },
  });

export const deleteUser = (userId: string) =>
  invoke<{ ok: boolean }>("admin-user-action", {
    method: "POST",
    body: { user_id: userId, action: "delete" },
  });

export const setUserRole = (userId: string, isAdmin: boolean) =>
  invoke<{ ok: boolean }>("admin-set-role", {
    method: "POST",
    body: { user_id: userId, is_admin: isAdmin },
  });

export type CreateUserInput = {
  email: string;
  password: string;
  role: "admin" | "user";
  display_name?: string;
};

export const createUser = (input: CreateUserInput) =>
  invoke<{ ok: boolean; user: { id: string; email: string | null; role: "admin" | "user" } }>("admin-create-user", {
    method: "POST",
    body: input as unknown as Record<string, unknown>,
  });

export type CatalogCar = {
  id: string;
  casting_name: string;
  year: number;
  series: string | null;
  line_type: "Mainline" | "Premium" | "RLC" | "TeamTransport" | "Entertainment" | "Other";
  treasure_hunt_type: "None" | "TH" | "STH";
  last_verified_at: string | null;
};

export const fetchCatalog = (page = 1, perPage = 50, q = "") =>
  invoke<{ cars: CatalogCar[]; total: number; page: number; per_page: number }>(
    `admin-list-cars?page=${page}&perPage=${perPage}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    { method: "GET" },
  );

export type CreateCarInput = {
  casting_name: string;
  year: number;
  series?: string | null;
  line_type?: CatalogCar["line_type"];
  treasure_hunt_type?: CatalogCar["treasure_hunt_type"];
  model_number?: string | null;
  sku?: string | null;
  barcode?: string | null;
};

export const createCar = (input: CreateCarInput) =>
  invoke<{ ok: boolean; id: string; barcode_error?: string }>("admin-create-car", {
    method: "POST",
    body: input as unknown as Record<string, unknown>,
  });

export const deleteCar = (carId: string) =>
  invoke<{ ok: boolean }>("admin-delete-car", {
    method: "POST",
    body: { car_id: carId },
  });

export const deletePhoto = (photoId: string) =>
  invoke<{ ok: boolean }>("admin-delete-photo", {
    method: "POST",
    body: { photo_id: photoId },
  });

export const updateReport = (reportId: string, status: "open" | "triaged" | "closed") =>
  invoke<{ ok: boolean }>("admin-update-report", {
    method: "POST",
    body: { report_id: reportId, status },
  });
