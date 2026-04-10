import * as Sentry from "@sentry/react-native";

let initialized = false;

/** Call once at app startup. No-op when `EXPO_PUBLIC_SENTRY_DSN` is unset. */
export function initSentry(): void {
  if (initialized) return;
  initialized = true;
  const dsn = process.env["EXPO_PUBLIC_SENTRY_DSN"];
  if (!dsn) return;

  Sentry.init({
    dsn,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.2,
  });
}
