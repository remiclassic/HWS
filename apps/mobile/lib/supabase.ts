import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const LAN_FALLBACK_PORT = "54321";

function hostFromExpoDevUri(uri: string | undefined | null): string | null {
  if (!uri) return null;
  const host = uri.split(":")[0];
  return host || null;
}

function devMachineHost(): string | null {
  const cfg = Constants.expoConfig?.hostUri;
  const legacy = (Constants.manifest as { debuggerHost?: string } | undefined)?.debuggerHost;
  const go = (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;
  return hostFromExpoDevUri(cfg) ?? hostFromExpoDevUri(legacy) ?? hostFromExpoDevUri(go);
}

function resolveSupabaseUrl(): string {
  const env = process.env["EXPO_PUBLIC_SUPABASE_URL"]?.replace(/\/$/, "");
  if (env) return env;
  if (__DEV__) {
    if (Platform.OS === "web") return `http://localhost:${LAN_FALLBACK_PORT}`;
    const host = devMachineHost();
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:${LAN_FALLBACK_PORT}`;
    }
    if (Platform.OS === "android" && Constants.isDevice === false) {
      return `http://10.0.2.2:${LAN_FALLBACK_PORT}`;
    }
    return `http://localhost:${LAN_FALLBACK_PORT}`;
  }
  throw new Error("EXPO_PUBLIC_SUPABASE_URL must be set for release builds");
}

function resolveAnonKey(): string {
  const key = process.env["EXPO_PUBLIC_SUPABASE_ANON_KEY"];
  if (!key) {
    if (__DEV__) {
      // Default anon key from `supabase start` (safe in local dev only).
      return "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
    }
    throw new Error("EXPO_PUBLIC_SUPABASE_ANON_KEY must be set for release builds");
  }
  return key;
}

// SecureStore on native, localStorage on web — prevents stealing access tokens from AsyncStorage.
const webStorage = {
  getItem: (key: string) =>
    Promise.resolve(typeof localStorage === "undefined" ? null : localStorage.getItem(key)),
  setItem: (key: string, value: string) => {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    return Promise.resolve();
  },
};

const nativeStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase: SupabaseClient = createClient(resolveSupabaseUrl(), resolveAnonKey(), {
  auth: {
    storage: Platform.OS === "web" ? webStorage : nativeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
    flowType: "pkce",
  },
});

export const isLocalEnv = (process.env["EXPO_PUBLIC_ENV"] ?? "local") === "local";
