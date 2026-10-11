const NETWORK_FAILURE = /failed to fetch|network request failed|load failed/i;

/** User-facing text for a caught value — avoids the "Error: " prefix `String(e)` adds. */
export function errorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  // fetch() reports an unreachable server in browser-speak; say what the user can act on.
  if (NETWORK_FAILURE.test(raw)) return "Can’t reach the server. Check your connection and try again.";
  return raw || "Something went wrong. Please try again.";
}
