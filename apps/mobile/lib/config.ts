import { Platform } from "react-native";

/** Override with EXPO_PUBLIC_API_URL (no trailing slash). */
export function getApiBase(): string {
  const env = process.env["EXPO_PUBLIC_API_URL"]?.replace(/\/$/, "");
  if (env) return env;
  if (Platform.OS === "android") return "http://10.0.2.2:3001";
  return "http://localhost:3001";
}

/** Turn an API-relative upload path (e.g. `/uploads/...`) into a fetchable URL. */
export function resolveApiAssetUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const base = getApiBase().replace(/\/$/, "");
  const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${p}`;
}
