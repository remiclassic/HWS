# Hot Wheels Spotter

Mobile-first collector app. **Expo (React Native + expo-router)** on the front, **Supabase** (Auth + Postgres + Storage + Edge Functions) on the back. Shared **Zod** schemas and **Drizzle** ORM in between.

- `apps/mobile/` — Expo app. Runs on web locally so you can develop without a phone.
- `supabase/functions/` — Deno Edge Functions (see [its README](supabase/functions/README.md)); all server-side logic that needs service-role.
- `packages/shared/` — Zod schemas + gamification rules used by both sides.
- `db/` — Drizzle schema (source of truth for migrations).
- `supabase/` — Supabase CLI config, generated migrations, seed data, RLS test suite.

**Local == prod.** `supabase start` runs the full stack in Docker (Postgres, GoTrue, PostgREST, Storage with S3/MinIO API, Realtime, Edge, Inbucket email catcher). The same mobile client code talks to `http://localhost:54321` locally and your hosted Supabase in production.

## Prerequisites

- Node 20+
- Docker (the Supabase CLI uses it to run the local stack)

Everything else is free and installed via `npm install`.

## Quick start

```bash
git clone … && cd HWS
npm install
npm run db:start        # spins up the full Supabase stack locally (first run pulls images)
npm run dev             # Expo web dev server → http://localhost:8081
```

You can also use the VS Code task **Run HWS Full Stack** in `/home/user/personal.code-workspace` — it launches Supabase, Edge Functions, and the web dev server in parallel.

## Seeded users (local dev only)

Loaded by `supabase/seed.sql` on every `npm run db:reset`. Never run in production.

| Role      | Email                      | Password              | Notes |
|-----------|----------------------------|-----------------------|-------|
| Collector | `dev@hotwheels.local`      | `dev-password-AA1`    | Demo garage + leaderboard opt-in. The login screen pre-fills these fields in local dev. |
| Admin     | `admin@hotwheels.local`    | `admin-password-AA1`  | `is_admin = true`. Settings shows an "Admin dashboard" link. |

**Email confirmations are disabled in local dev** (`supabase/config.toml` → `enable_confirmations = false`) so signup → sign-in works without clicking a link. **Re-enable confirmations in your hosted Supabase project** (Dashboard → Authentication → Providers → Email → Confirm email) before shipping.

If you want to exercise the full email flow locally, flip that config back on — all emails Supabase sends locally (signup confirmations, password resets, magic links) land in **Inbucket at <http://localhost:54324>**. Open that URL in your browser to read them; click the link just like a real user would.

Anonymous sign-in is also enabled in local dev. The login screen shows a "Continue anonymously (dev only)" button gated to `EXPO_PUBLIC_ENV=local`. Disable anonymous auth in the hosted Supabase Auth dashboard before shipping.

## Admin web app (separate from mobile)

The admin dashboard is a **standalone web app** at `apps/admin/` (Vite + React + TS). It is not part of the mobile bundle — admins shouldn't need a phone, and the mobile app shouldn't ship admin code.

```bash
npm run admin          # Vite dev server on http://localhost:5174
# or VS Code task: "Run HWS Admin (Web)"
```

Sign in with `admin@hotwheels.local` / `admin-password-AA1` (prefilled in dev).

You get:

- **Overview tiles:** total users, new signups (24h / 7d), admins, garage rows, photos, open data reports.
- **User list:** email, display name, creation date, last sign-in, garage + photo counts, ban state, admin flag.
- **Per-user actions:** Ban (30 days), Unban, Delete (cascades profile/garage and purges the user's Storage folder). Admins cannot act on themselves or other admins.
- **Photo moderation:** `admin-delete-photo` Edge Function is wired and callable from `src/lib/api.ts`; dedicated UI is a short follow-up.

**Security model:**
- Non-admin users who sign into the admin app see an "Admin only" screen.
- Mutations run in Edge Functions guarded server-side by `requireAdminCtx` (checks `user_profiles.is_admin`). The client gate is cosmetic; the server is authoritative.
- Service-role key never leaves the Edge Function — only the anon key ships to the browser.
- `is_admin` cannot be self-promoted via RLS — only a service-role operation (like the seed or another admin-only future Edge Function) can set it.

**Requires `supabase start` AND Edge Functions running.** Start both with `npm run db:start` + `npm run functions`, or run the "Run HWS Full Stack" workspace task.

## Local services (from `supabase start`)

| Service           | URL                                    |
|-------------------|----------------------------------------|
| API (PostgREST)   | <http://localhost:54321>               |
| Studio            | <http://localhost:54323>                |
| Inbucket (email)  | <http://localhost:54324>                |
| Postgres          | `postgresql://postgres:postgres@localhost:54322/postgres` |
| Storage S3 API    | <http://localhost:54321/storage/v1/s3>  |

## Scripts

Root (`package.json`):

```bash
npm run db:start       # supabase start
npm run db:stop        # supabase stop
npm run db:reset       # re-apply migrations + seed (recreates the dev user)
npm run db:generate    # Drizzle → SQL migrations in supabase/migrations/
npm run dev            # expo start (opens web by default)
npm run test           # mobile vitest + RLS integration tests
npm run test:mobile    # just the mobile tests
npm run test:rls       # just the supabase RLS tests
npm run lint
```

Mobile (`apps/mobile/`):

```bash
npm run start          # expo start (web/ios/android picker)
npm run web            # expo start --web
npm run android
npm run ios
npm run test
npm run typecheck
```

## Auth

- `@supabase/supabase-js` owns sessions. Storage adapter: `expo-secure-store` on native, `localStorage` on web (both set up in `apps/mobile/lib/supabase.ts`).
- PKCE flow, auto-refresh, email confirmation required, secure password change required.
- Password policy (enforced server-side in `supabase/config.toml`): ≥10 chars, at least one lowercase, one uppercase, one digit.
- Screens: `login`, `signup`, `forgot-password`, settings-page sign-out. `link-email` is retired (use `supabase.auth.updateUser({ email })` if you ever need to change an address).
- `lib/auth.ts` exposes `useSession`, `signInWithPassword`, `signUpWithPassword`, `sendPasswordReset`, `updatePassword`, `signOut`, `signInAnonymouslyDev`.

## Database & ORM

- Edit `db/schema.ts`, then `npm run db:generate` to emit SQL into `supabase/migrations/`.
- Review the SQL, add RLS + policies for any new table before committing.
- Apply locally with `npm run db:reset`.

## Security (what's enforced, not aspirational)

- **RLS on every public table, default deny.** Cross-user isolation verified by 7 integration tests in `supabase/tests/rls.test.ts` that run against the live local stack.
- Mobile bundle never contains the service-role key. All service-role operations run in Edge Functions.
- Tokens stored via `expo-secure-store` on native (keystore/keychain-backed).
- Storage bucket `user-car-photos` is private with folder-name-as-userId RLS. Photos are uploaded via short-lived signed URLs.
- Upload pipeline resizes to ≤1600px and re-encodes to strip EXIF/GPS (`apps/mobile/lib/photoPipeline.ts`).
- Password/email rate limits configured in `supabase/config.toml`. JWT expiry 1h, refresh rotation enabled.

## Uploads

Mobile flow: `expo-image-picker` (library) or `expo-camera` (capture) → `expo-image-manipulator` (resize + strip EXIF) → `supabase.storage.from('user-car-photos').upload(<userId>/<photoId>.jpg, blob)` → insert into `user_car_photos`. Photos render via signed URLs returned from `fetchGarage`.

On web, the Photo screen uses the library picker only (no live camera). On native, both are available.

## Edge Functions

Located under `supabase/functions/`:

- `record-scan` — awards XP for barcode scans with streak logic (service-role required because users must not edit their own totals).
- `delete-account` — deletes the caller's `auth.users` row (cascades to profile/garage) and purges their Storage bucket.

Run locally with `npx supabase functions serve` (or the "Run HWS Edge Functions" VS Code task).

## Tests

- **Mobile** (`apps/mobile`) — Vitest + jsdom + `react-native-web` alias + Expo mocks. Run with `npm run test:mobile`.
- **RLS / backend security** (`supabase/tests`) — Vitest hitting the local Supabase stack as two fresh users, asserting cross-user isolation and catalog write denial. Run with `npm run test:rls`.

RLS tests require `npm run db:start` to be running.

## Environment variables

`apps/mobile/.env.local` (git-ignored — copy from `.env.local.example`):

```bash
EXPO_PUBLIC_ENV=local
# Leave blank to auto-detect the `supabase start` instance.
# For release builds, set these to your hosted Supabase project:
# EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Anything `EXPO_PUBLIC_*` is bundled into the app — never put secrets here.

Service-role key: only needed inside Edge Functions, injected by Supabase at runtime.

## Deploying

### Prod env files

Both apps read `VITE_*` / `EXPO_PUBLIC_*` vars at build time. Templates are checked in; the real files are `.gitignore`d.

```bash
cp apps/mobile/.env.production.example apps/mobile/.env.production
cp apps/admin/.env.production.example  apps/admin/.env.production
# edit both — replace the example URL/anon key with your hosted project's values
```

**Only ever put the `anon` / `publishable` key in these files.** Anon keys are designed to ship to the client — access control is enforced by RLS, not by key secrecy. The **service-role key** and the **database password** are real secrets and belong only in the Supabase dashboard / Edge Function runtime.

### Build & deploy

- **Mobile app:** `eas build --profile production` (wire an `eas.json` when you're ready). For local-only testing: `npx expo export --platform web` produces a static bundle.
- **Admin web app:** `npm run build -w @hotwheels/admin` emits `apps/admin/dist/` — host on Vercel, Netlify, Cloudflare Pages, or behind a reverse proxy. It's a static SPA; add a rewrite rule so every path serves `index.html`.
- **Database:** `npx supabase db push --project-ref <ref>` pushes `supabase/migrations/*.sql`.
- **Edge Functions:** `npx supabase functions deploy <name> --project-ref <ref>`. Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`) are injected automatically by the runtime — don't set them manually.

## Security & production hardening

Before flipping your hosted Supabase project live, work through this list. None of these are optional.

### Supabase project settings

- [ ] **Database → Reset database password.** Use a password manager. Don't reuse the local default.
- [ ] **API → service_role key → Rotate** if it has ever been exposed. This key bypasses RLS and can do anything.
- [ ] **Authentication → Providers → Email → Confirm email: ON.** Local dev has this off (`supabase/config.toml → enable_confirmations = false`); production must confirm.
- [ ] **Authentication → Providers → Anonymous sign-ins: OFF.** The mobile app's "Continue anonymously (dev only)" button is already gated to `EXPO_PUBLIC_ENV=local`, but disabling at the server level is defense in depth.
- [ ] **Authentication → Password policy:** minimum 10 characters, require upper + lower + digit (mirrors `config.toml`).
- [ ] **Authentication → Rate limits:** keep the defaults or tighten. Email sends, OTP verifications, and sign-ups should have per-IP caps.
- [ ] **Database → Network Restrictions:** allowlist only IPs that need direct DB access — typically none, since everything goes through PostgREST/Edge with RLS.
- [ ] **Database → Extensions:** disable anything you don't use (reduces attack surface).

### RLS & schema

- [ ] Confirm every table in `public` has `relrowsecurity = t`:
  ```sql
  select relname, relrowsecurity from pg_class
  where relnamespace = 'public'::regnamespace and relkind = 'r';
  ```
- [ ] Run the integration suite against a staging project (clone of prod) before releases: `DATABASE_URL=… npm run test:rls`.
- [ ] Don't grant the `anon` role anything beyond what RLS allows. `authenticated` gets RLS-gated selects + owner-scoped writes.

### Storage

- [ ] Bucket `user-car-photos` is **private** (not public) — confirmed in `config.toml`.
- [ ] Object path convention `<userId>/<photoId>.<ext>` is enforced by RLS on `storage.objects`.
- [ ] MIME allowlist (`image/png`, `image/jpeg`, `image/webp`) and 8 MiB size limit set in `config.toml` — verify they mirror in the hosted project's Storage settings.
- [ ] Consider adding a virus/image-hash scan Edge Function on upload if you expect untrusted content.

### Client apps

- [ ] Neither app bundles the service-role key. Grep your build output to confirm (`rg "service_role" apps/*/dist`).
- [ ] Tokens stored via `expo-secure-store` on native; `localStorage` on web. The mobile `lib/supabase.ts` adapter is already platform-split.
- [ ] `EXPO_PUBLIC_ENV=production` disables dev-only UI like anonymous sign-in and the login prefill.
- [ ] Release builds point at your Supabase URL, not `localhost`.

### Edge Functions

- [ ] Every `admin-*` function starts with `requireAdminCtx(req)` — server-side role check. Do not trust the client.
- [ ] Mutating functions reject non-POST. Listing functions reject non-GET. (See existing code for the pattern.)
- [ ] `_shared/auth.ts` verifies the Supabase JWT via the anon-scoped client before escalating to service role.

### Monitoring & ops

- [ ] Enable Supabase log drains or connect Logtail/Datadog to `functions` and `postgres` logs.
- [ ] Wire Sentry in both apps (mobile's `lib/sentry.{native,web}.ts` are scaffolded; set `EXPO_PUBLIC_SENTRY_DSN`).
- [ ] Set up Supabase's database connection pooling (PgBouncer / Supavisor) URL and use it for server-to-DB traffic; keep the direct connection for migrations only.
- [ ] Back up regularly. Supabase Pro has daily PITR; the free tier only keeps the last 7-day daily dump.

### Watching for unexpected connections

The Supabase dashboard (Database → Reports → Connections) and this query show every live connection:

```sql
select pid, usename, application_name, client_addr, state, query_start
from pg_stat_activity
where datname = 'postgres'
order by query_start desc;
```

Internal: `supabase_admin`, `authenticator`, `pgbouncer`, `postgrest`, `supabase_realtime_admin`. Anything else should be yours (Studio / `psql` / a migration job). If you see client IPs you don't recognize, **rotate the DB password and service-role key immediately**, then drop the sessions:

```sql
select pg_terminate_backend(pid)
from pg_stat_activity
where usename = 'postgres' and pid <> pg_backend_pid();
```

### Local stack exposure

`supabase start` binds every port to `0.0.0.0` by design — anyone on your LAN can reach your dev Postgres on `:54322`. That's fine on a laptop behind a home router, not fine on a café Wi-Fi. Block with the host firewall:

```bash
sudo ufw deny  proto tcp from any to any port 54321:54327
sudo ufw allow proto tcp from 127.0.0.1 to any port 54321:54327
```

The local DB user/password (`postgres` / `postgres`) is a published Supabase-CLI default and cannot be changed without patching the CLI; use firewall isolation instead.

## Project conventions

- ESM everywhere. Zod schemas in `packages/shared` are the source of truth for request/response shapes.
- Lint runs with `--max-warnings 0`.
- Drizzle is the only migration authoring tool. Don't hand-edit `supabase/migrations/*.sql` after generation unless adding RLS policies or data migrations — keep the diff reviewable.
- Keep `packages/shared/src/gamification.ts` in sync if you change XP/achievement rules — it's shared with the Edge Functions.
