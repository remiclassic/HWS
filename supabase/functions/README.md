# Supabase Edge Functions

All server-side logic that needs service-role (user deletion, XP awards, admin ops) lives here. Deno runtime.

## Functions

| Name                  | Method | Caller      | Purpose                                                                 |
|-----------------------|--------|-------------|-------------------------------------------------------------------------|
| `record-scan`         | POST   | mobile      | Award XP for a barcode scan + update streak.                            |
| `delete-account`      | POST   | mobile      | User self-delete (cascades DB + purges Storage).                        |
| `admin-stats`         | GET    | admin web   | Dashboard aggregate counts.                                             |
| `admin-list-users`    | GET    | admin web   | Paginated user list with per-user garage/photo counts.                  |
| `admin-user-action`   | POST   | admin web   | Ban / unban / delete another user.                                      |
| `admin-set-role`      | POST   | admin web   | Promote / demote `is_admin`.                                            |
| `admin-create-user`   | POST   | admin web   | Create a new user with role (pre-confirmed).                            |
| `admin-list-photos`   | GET    | admin web   | Recent photos with signed thumbnails.                                   |
| `admin-delete-photo`  | POST   | admin web   | Remove a Storage object + DB row.                                       |
| `admin-list-reports`  | GET    | admin web   | Car data reports (filter by status).                                    |
| `admin-update-report` | POST   | admin web   | Triage / close / reopen a report.                                       |
| `admin-list-cars`     | GET    | admin web   | Paginated catalog (search).                                             |
| `admin-create-car`    | POST   | admin web   | Create a canonical car + optional barcode mapping.                      |
| `admin-delete-car`    | POST   | admin web   | Delete a canonical car (cascades).                                      |

## Shared helpers

- `_shared/auth.ts` — `requireAuthCtx(req)`: verifies `Authorization: Bearer …`, returns `{ userId, user, admin }` where `admin` is a service-role-scoped Supabase client.
- `_shared/admin.ts` — `requireAdminCtx(req)`: extends auth with an `is_admin = true` check. Throws a 403 Response otherwise. Every `admin-*` function uses it as its first line.

## Running locally

```bash
npm run functions
# or: npx supabase functions serve
# or VS Code task: "Run HWS Edge Functions"
```

Serves at `http://localhost:54321/functions/v1/<name>`.

## Deploying

```bash
npx supabase functions deploy <name> --project-ref <ref>
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the Supabase runtime. Don't set them manually.
