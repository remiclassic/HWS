import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_API_PORT = process.env["EXPO_PUBLIC_API_PORT"] ?? "3001";

function hostFromExpoDevUri(uri: string | undefined | null): string | null {
  if (!uri) return null;
  const host = uri.split(":")[0];
  return host || null;
}

/**
 * LAN IP / host of the machine running Metro (Expo Go / dev client). Physical devices need this;
 * `10.0.2.2` and `localhost` defaults only work for emulators/simulator.
 */
function expoDevMachineHost(): string | null {
  const fromConfig = hostFromExpoDevUri(Constants.expoConfig?.hostUri);
  if (fromConfig) return fromConfig;
  const legacy = Constants.manifest as { debuggerHost?: string } | undefined;
  const fromLegacy = hostFromExpoDevUri(legacy?.debuggerHost);
  if (fromLegacy) return fromLegacy;
  const go = Constants.expoGoConfig as { debuggerHost?: string } | undefined;
  return hostFromExpoDevUri(go?.debuggerHost);
}

/** Override with EXPO_PUBLIC_API_URL (no trailing slash). Optional: EXPO_PUBLIC_API_PORT (default 3001). */
export function getApiBase(): string {
  const env = process.env["EXPO_PUBLIC_API_URL"]?.replace(/\/$/, "");
  if (env) return env;

  if (Platform.OS === "web") {
    return `http://localhost:${DEFAULT_API_PORT}`;
  }

  if (__DEV__) {
    const host = expoDevMachineHost();
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:${DEFAULT_API_PORT}`;
    }
  }

  // Android emulator: guest alias to host loopback (wrong on a physical phone).
  if (Platform.OS === "android" && Constants.isDevice === false) {
    return `http://10.0.2.2:${DEFAULT_API_PORT}`;
  }

  return `http://localhost:${DEFAULT_API_PORT}`;
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
