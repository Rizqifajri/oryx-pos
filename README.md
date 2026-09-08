# dio-sys

Multi-tenant dine-in restaurant ordering system. [Turborepo](https://turborepo.com)-powered monorepo (npm workspaces) merged from the formerly-separate `dio-sys-be` and `dio-sys-fe` repositories (full commit history preserved via `git subtree`).

See `docs/Recovery Agent Prompt.md` for the recovery/refactor process this repo follows, and `ARCHITECTURE_AUDIT.md` / `MIGRATION_PLAN.md` (repo root, once written) for the current state and roadmap.

## Structure

```
apps/
  server/     # Express + TypeScript API (was dio-sys-be/apps/server)
  web/        # Next.js 16 + React 19 frontend (was dio-sys-fe)
packages/
  db/         # Drizzle ORM schema, migrations, seed (@dio-sys-be/db)
  env/        # Zod-validated env loader (@dio-sys-be/env)
  config/     # Shared TypeScript base config (@dio-sys-be/config)
docs/
  BACKEND_API.md   # API contract (canonical — was duplicated with drift in both repos, backend copy kept)
```

## Getting started

```bash
npm install

# backend — needs apps/server/.env (see apps/server/.env.example)
#   DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN,
#   and R2_* for image uploads (see "Image uploads" below)
npm run db:push
npm run db:seed
npm run dev:api      # http://localhost:3000

# frontend — needs apps/web/.env.local (NEXT_PUBLIC_API_URL, JWT_SECRET)
npm run dev:web      # http://localhost:3001
```

## Scripts

All tasks run through Turborepo (`turbo.json` defines the pipeline: caching, `^build` ordering, and env-var hashing).

- `npm run dev` — run every app in dev (parallel, uncached, persistent)
- `npm run dev:api` / `npm run dev:web` — run a single app (`--filter`)
- `npm run build` — build all workspaces in dependency order (cached; outputs `dist/**`, `.next/**`)
- `npm run check-types` / `npm run lint` — across all workspaces (cached)
- `npm run start` — start built apps (depends on `build`)
- `npm run db:push` / `db:generate` / `db:migrate` / `db:seed` / `db:studio` — database workspace (`@dio-sys-be/db`, uncached)

Turbo caches task outputs by content hash — re-running an unchanged task replays instantly (`>>> FULL TURBO`). The cache lives in `.turbo/` (git-ignored). Ad-hoc filtering: `npx turbo run build --filter=server`.

## Image uploads (Cloudflare R2)

Menu images are uploaded **through the backend** to Cloudflare R2 (S3-compatible) — the web app streams the file to `POST /api/v1/uploads/menu` (auth + `menu:manage|create|update`), which validates it (JPEG/PNG/WebP/GIF, ≤5 MB), stores it under `menus/<tenantId>/<uuid>.<ext>`, and returns the public URL. Nothing is written to the web server's disk.

To enable it, set the `R2_*` vars in `apps/server/.env` (template in `.env.example`):
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`. Until they're set the upload endpoint returns a clear `503`; the rest of the app runs normally. The bucket must be publicly readable (enable the `r2.dev` URL or attach a custom domain, and set `R2_PUBLIC_URL` to that origin).

No test runner is configured yet in either app (tracked in `MIGRATION_PLAN.md`).
