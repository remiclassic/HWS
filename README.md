# Hot Wheels Spotter

Monorepo: **Expo (React Native) mobile app**, **Fastify API**, **Postgres + Drizzle**, shared **Zod** schemas.

## Prerequisites

- Node 20+
- Docker (optional, for local Postgres)

## Database

Start Postgres:

```bash
npm run db:up
```

Default URL matches `apps/api/drizzle.config.ts`: `postgresql://spotter:spotter_dev@localhost:5433/hotwheels_spotter`.

Apply migrations (from repo root):

```bash
cd apps/api
npx drizzle-kit migrate
```

Seed demo catalog:

```bash
npx tsx src/scripts/seed.ts
```

If you already have duplicate `(user_id, car_id)` garage rows, migration `0001_user_car_unique` dedupes before adding the unique index.

## API

```bash
cd apps/api
npm install
cp .env.example .env   # create if missing; set DATABASE_URL, JWT_SECRET optional
npm run dev
```

Default port: **3001**.

### Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `PORT` | Listen port (default `3001`) |
| `CORS_ORIGIN` | CORS origin (default `*`) |
| `INTERNAL_IMPORT_KEY` | Required for ingestion routes |

### Ingestion (catalog pipeline)

- **Single car:** `POST /internal/import/manual-car` with header `x-internal-key: <INTERNAL_IMPORT_KEY>`. Body shape matches `parseManualCarPayload` in `apps/api/src/ingestion/manualImport.ts`.
- **Bulk (up to 500):** `POST /internal/import/manual-cars-bulk` with `{ "cars": [ ... ], "stop_on_error": false }`. Same item shape as single import. Use for refresh jobs; idempotent upsert per casting name.

Anonymous auth: `POST /auth/anonymous` returns a JWT for `/me/garage` routes.

## Mobile

```bash
cd apps/mobile
npm install
```

Set API base URL for physical devices or non-default hosts:

```bash
# .env or shell
EXPO_PUBLIC_API_URL=http://192.168.x.x:3001
```

Android emulator uses `http://10.0.2.2:3001` by default when unset. iOS simulator uses `http://localhost:3001`.

```bash
npm run start
```

Barcode scanning uses **expo-camera** (device only; web shows a fallback). After `app.json` plugin changes, run a new dev client / prebuild if you use native builds.

## Workspace scripts

```bash
npm run build    # shared + api
npm run lint
```

## Offline and backups

Garage data is cached with TanStack Query persistence after a successful fetch. Edits and new saves need the API unless you add a full offline queue. Use **My Garage → share (header)** to export a JSON backup for your own records or to move data manually between installs.
