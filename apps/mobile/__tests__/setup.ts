// Test setup: stub Expo-only globals so modules that import expo-constants/secure-store don't crash.
import { vi } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__DEV__ = true;

vi.mock("expo-constants", () => ({
  default: { expoConfig: { hostUri: null }, expoGoConfig: null, manifest: null, isDevice: false },
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => undefined),
  deleteItemAsync: vi.fn(async () => undefined),
}));

vi.mock("react-native", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = (await vi.importActual("react-native-web")) as any;
  return { ...actual, Platform: { ...actual.Platform, OS: "web" } };
});
