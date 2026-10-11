import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const KEYS = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

/**
 * The suites need the stack's URL and keys. Anything already exported wins (e.g. a staging
 * project); otherwise ask the running local stack. Done here rather than with shell in the
 * npm script so it behaves the same under cmd, PowerShell and POSIX shells.
 */
function supabaseEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const k of KEYS) if (process.env[k]) env[k] = process.env[k] as string;
  if (KEYS.every((k) => env[k])) return env;

  let out: string;
  try {
    out = execSync("npx supabase status -o env", {
      cwd: fileURLToPath(new URL("../..", import.meta.url)),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    // Stack not running: let the test files report the missing variables.
    return env;
  }
  const status: Record<string, string> = {};
  for (const line of out.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)="?(.*?)"?$/.exec(line.trim());
    if (m) status[m[1] as string] = m[2] as string;
  }
  const local: Record<(typeof KEYS)[number], string | undefined> = {
    SUPABASE_URL: status["API_URL"],
    SUPABASE_ANON_KEY: status["ANON_KEY"],
    SUPABASE_SERVICE_ROLE_KEY: status["SERVICE_ROLE_KEY"],
  };
  for (const k of KEYS) if (!env[k] && local[k]) env[k] = local[k] as string;
  return env;
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["*.test.ts"],
    hookTimeout: 30_000,
    testTimeout: 30_000,
    env: supabaseEnv(),
  },
});
