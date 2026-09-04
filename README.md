# dio-sys

Multi-tenant dine-in restaurant ordering system. Monorepo merged from the formerly-separate `dio-sys-be` and `dio-sys-fe` repositories (full commit history preserved via `git subtree`).

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

# backend — needs apps/server/.env (DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN)
npm run db:push
npm run db:seed
npm run dev:api      # http://localhost:3000

# frontend — needs apps/web/.env.local (NEXT_PUBLIC_API_URL, JWT_SECRET)
npm run dev:web      # http://localhost:3001
```

## Scripts

- `npm run dev:api` / `npm run dev:web` — run each app individually
- `npm run build` / `npm run check-types` / `npm run lint` — across all workspaces
- `npm run db:push` / `db:generate` / `db:migrate` / `db:seed` / `db:studio` — database workspace

No test runner is configured yet in either app (tracked in `MIGRATION_PLAN.md`).
