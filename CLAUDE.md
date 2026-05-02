# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

**Mobile-first app backed by Supabase** (Auth + Postgres + Storage + Edge Functions).

- `apps/mobile/` — Expo (React Native + expo-router). Runs on web (`expo start --web`) for local dev so you don't need a phone/simulator.
- `supabase/functions/` — Deno Supabase Edge Functions (replaces the old Fastify `apps/api`).
- `apps/admin/` — standalone Vite + React web app for administering users, content, and catalog.
- `packages/shared/` — Zod schemas + shared logic (gamification).
- `db/` — Drizzle ORM schema and drizzle-kit config. All Postgres changes start here.
- `supabase/` — Supabase CLI config, migrations, and local seed. `supabase start` spins up Postgres + GoTrue + Storage (S3-compatible) + Realtime + Edge + Inbucket email catcher.

**Local = prod parity:** the mobile app points at `http://localhost:54321` locally and at the hosted Supabase in prod. Same client code, same APIs, same Storage SDK.

## Common commands

From repo root:

```bash
npm run db:start           # supabase start (first run pulls images)
npm run db:stop
npm run db:reset           # re-apply migrations + seed.sql (recreates test users)
npm run db:generate        # drizzle-kit generate → supabase/migrations/
npm run functions          # supabase functions serve (required for admin + XP + account-delete)
npm run dev                # start mobile on web (http://localhost:8081)
npm run admin              # start admin web app (http://localhost:5174)
npm run test               # mobile vitest + RLS integration suite
npm run test:mobile
npm run test:rls
npm run lint
```

## Seeded users (local dev only)

| Role  | Email                     | Password              | Notes |
|-------|---------------------------|-----------------------|-------|
| User  | `dev@hotwheels.local`     | `dev-password-AA1`    | Prefilled on the login screen in dev. |
| Admin | `admin@hotwheels.local`   | `admin-password-AA1`  | `is_admin = true`. Sign into the admin web app. |

Pre-confirmed. Email confirmations are **disabled locally** (`config.toml → enable_confirmations = false`) so signup → sign-in works without clicking a link. Local emails (if enabled) land in Inbucket: <http://localhost:54324>.

Anonymous sign-in is enabled locally; the login screen's "Continue anonymously (dev only)" button is gated to `EXPO_PUBLIC_ENV=local`. Disable anonymous auth in the hosted Supabase dashboard before release.

A ~15-car starter catalog is seeded so the app is usable immediately. Real admins add cars via the admin web app's Catalog page.

## Database workflow

1. Edit `db/schema.ts` (Drizzle).
2. `npm run db:generate` — emits a new SQL file in `supabase/migrations/`.
3. Review the SQL, add RLS/policies for any new table.
4. `npm run db:reset` to apply locally.

**RLS is the security boundary.** Every public table must have `enable row level security` + explicit policies. Default deny. The mobile app uses the `anon`/`authenticated` roles and relies entirely on RLS — no server in the middle.

## Auth & secrets

- Mobile uses `@supabase/supabase-js`. Session storage: `expo-secure-store` on native, `localStorage` on web (adapter in `apps/mobile/lib/supabase.ts`).
- The anon key is bundled in the client — safe because RLS enforces access. Never bundle the service-role key.
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` override local defaults; required for release builds.
- Anonymous sign-in is disabled in `config.toml`; enable-on-demand only under `EXPO_PUBLIC_ENV=local`.

## Uploads

- Bucket `user-car-photos` (private). Path convention: `<userId>/<photoId>.<ext>`. RLS keys on folder-name = `auth.uid()`.
- Mobile pipeline: `expo-image-picker` → `expo-image-manipulator` (≤1600px, strip EXIF) → `supabase.storage.from('user-car-photos').upload(...)`.
- Read via short-lived signed URLs.

## Admin web app (`apps/admin/`)

Separate Vite + React + TS web app at <http://localhost:5174> via `npm run admin`. Sign in with `admin@hotwheels.local`. Sidebar-nav dashboard with pages for Overview, Users, Catalog, Content (photo moderation), Reports (car data reports triage), Settings (admin roster + create-user form with role selector).

All mutations go through service-role-guarded Edge Functions — the browser only ever uses the anon key. Non-admins signing in are shown an "Admin only" screen.

## Edge Functions (`supabase/functions/`)

| Name                   | Caller       | Purpose                                                                 |
|------------------------|--------------|-------------------------------------------------------------------------|
| `record-scan`          | mobile       | Award XP + update streak for a barcode scan                             |
| `delete-account`       | mobile       | User self-delete (DB cascade + Storage purge)                           |
| `admin-stats`          | admin web    | Dashboard aggregate counts                                              |
| `admin-list-users`     | admin web    | Paginated users with garage/photo counts                                |
| `admin-user-action`    | admin web    | Ban / unban / delete a user                                             |
| `admin-set-role`       | admin web    | Promote / demote `is_admin`                                             |
| `admin-create-user`    | admin web    | Create a user (pre-confirmed) with role at creation                     |
| `admin-list-photos`    | admin web    | Recent photos with signed thumbnails                                    |
| `admin-delete-photo`   | admin web    | Remove a Storage object + DB row                                        |
| `admin-list-reports`   | admin web    | Car data reports (filterable by status)                                 |
| `admin-update-report`  | admin web    | Triage / close / reopen a report                                        |
| `admin-list-cars`      | admin web    | Paginated catalog (search by casting name)                              |
| `admin-create-car`     | admin web    | Create a canonical car + optional barcode                               |
| `admin-delete-car`     | admin web    | Delete a canonical car (cascades)                                       |

Every `admin-*` function starts with `_shared/admin.ts → requireAdminCtx(req)`: verifies the Supabase JWT, then asserts `user_profiles.is_admin = true`. Run locally with `npm run functions` or the "Run HWS Edge Functions" workspace task.

## Migration status

All complete:
- Fastify `apps/api` and `infra/docker-compose.yml` deleted. Supabase is the single backend.
- `supabase/migrations/20260413000000_init.sql`: schema + RLS on all 15 public tables + policies + signup trigger (auto-creates `user_profiles` and `user_gamification`).
- `supabase/migrations/20260413100000_admin_role.sql`: `user_profiles.is_admin` + `public.is_admin(uid)` helper + admin-read RLS policies.
- `config.toml`: JWT 1h, refresh rotation + reuse-on-10s, min password 10 chars w/ upper+lower+digits, **email confirmations disabled locally** (must be ON in prod), anonymous sign-in enabled locally (OFF in prod), email rate limits.
- `db/`: Drizzle schema + drizzle-kit pointed at local Supabase (generates into `supabase/migrations/`).
- Seed: two pre-confirmed users (`dev@` + `admin@`) + ~15-casting starter catalog + barcode mappings. No user garage rows — every user starts blank.
- Storage bucket `user-car-photos` (private, 8MiB, image allowlist) with RLS on folder-name = `auth.uid()`.
- Mobile: `lib/supabase.ts` (SecureStore/localStorage adapter, PKCE), `lib/auth.ts`, `lib/api.ts` (full Supabase facade), `lib/photoPipeline.ts` (resize ≤1600px + EXIF strip).
- Auth screens: `login.tsx` (dev-prefill + "just signed up" banner), `signup.tsx`, `forgot-password.tsx`. `_layout.tsx` routes unauthed users to `/login`.
- `apps/admin/` — standalone Vite + React dashboard with shell nav, Overview / Users / Catalog / Content / Reports / Settings pages, custom `ConfirmDialog`.
- Tests: mobile Vitest (jsdom + react-native-web + Expo mocks), RLS integration suite proving cross-user isolation + catalog write denial. Run with `npm run test`.

Outstanding (nice-to-have, not blocking):
- Port want-list push fan-out + bulk ingestion as Edge Functions.
- Playwright e2e.
- CI rewrite to spin up `supabase start` in Actions.
- Email-change flow (`supabase.auth.updateUser({ email })`) on settings screen.
- Standalone "spotted in the wild" photo upload (today photos attach to a garage row).

## Notable fixes shipped along the way

- **Zod datetime tolerance.** Postgres emits `"...+00:00"` offsets, which Zod's strict `.datetime()` rejects. All timestamp fields in `packages/shared` now use `.datetime({ offset: true })`. Root cause of empty-garage / "skipped row" warnings.
- **Duplicate-add UX.** `addToGarage` pre-checks via `SELECT` (friendly `AlreadyInGarageError`) + falls back to 23505 detection for concurrent-write races. Car detail screen shows an "Already in garage" alert.
- **`fetchGarage`** no longer double-filters on `user_id` — RLS is authoritative; removing the explicit filter eliminates stale-session false empties. Malformed rows are skipped with a `console.warn` instead of failing the whole query.
- **Garage error banner** now displays the actual error message + a Retry button (was a generic "check connection").
- **TanStack Query** defaults: `retry: 2` with exponential backoff, `refetchOnWindowFocus: false`, persister only dehydrates successful queries.
- **Web style deprecations** handled via `Platform.select`: `shadow*` → `boxShadow` (theme + FAB), `textShadow*` → `textShadow` (photo screen). `pointerEvents` moved into the style object.
- **Garage export** on web falls back from `Share.share` (no-op on desktop) to a real `.json` download.
- **ConfirmDialog** replaces `Alert.alert`-with-buttons (buttons don't fire `onPress` on web) for Sign out, Delete account, and admin actions.
- **Route registration** fixed: `garage-item/[id]` → `garage-item/[id]/index`.
- **`useSession`** wipes query cache only on identity change, not on every token refresh.
- **React singleton in Metro.** `expo-router@6` declares `peer react: "*"`, causing npm to nest `react@19.2.5` in `apps/mobile/node_modules/` even when the root pins `react@19.1.0`. `extraNodeModules` loses to local resolution; `resolver.resolveRequest` in `metro.config.js` intercepts first and forces all `react`/`react-dom`/`react-native` imports to the root copy. `react` and `react-dom` are pinned without `^` in `apps/mobile/package.json`; `react-test-renderer` is an explicit devDep for the same reason.
- **Release build env vars.** `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are read by Metro at bundle time from `.env.production` (git-ignored; copy from `.env.production.example`). The `build:android:release` script sets `NODE_ENV=production` explicitly so Metro loads the right env file rather than `.env.local`.

## Conventions

- ESM everywhere; mobile uses Metro's resolution.
- Lint runs with `--max-warnings 0`.
- Zod schemas in `packages/shared` are the source of truth for request/response shapes; validate Supabase responses against them.
- Gamification rules in `packages/shared/src/gamification.ts` are shared with Edge Functions (imported via npm specifier).
