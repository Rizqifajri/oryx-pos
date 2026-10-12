# Oryx POS

Multi-tenant point-of-sale and QR table-ordering system for restaurants. Each restaurant (a *tenant*) gets a staff dashboard and POS; its guests scan a QR code on the table to order and pay from their phone.

## What it does

- **POS cashier**: take dine-in orders onto a table's tab, or takeout orders paid on the spot.
- **QR table ordering**: guests scan, browse the menu, send rounds to the kitchen, call a waiter, and pay the whole bill, or split it, through Midtrans (QRIS, e-wallets, cards) or at the cashier.
- **Floor management**: live table sessions, move or merge tables, settle bills, handle guest requests.
- **Kitchen board**: orders move `NEW → PROCESSING → COMPLETED` (or `CANCELED`).
- **Menu & inventory**: items, categories, photos (Cloudflare R2), in/out-of-stock toggles.
- **Staff & access**: users, roles and fine-grained permissions per restaurant.
- **Platform admin**: a super-admin manages every restaurant from one place.

## Stack

| Part | Tech |
| --- | --- |
| `apps/api` | NestJS 11, TypeScript, Zod, JWT (`jose`), Midtrans, Cloudflare R2 |
| `apps/web` | Next.js 16 (App Router), React 19, TanStack Query, react-hook-form, Tailwind, shadcn/ui |
| `packages/db` | Drizzle ORM on PostgreSQL (Neon) |
| `packages/env` | Zod-validated environment for the API |
| Tooling | Turborepo, npm workspaces |

## Repository layout

```
apps/
  api/            NestJS API, served at /api/v1
    src/modules/  one folder per domain: controller → service → repository
    src/scripts/  check-permissions.ts, gen-api-docs.ts, set-r2-cors.ts
    api/index.ts  Vercel serverless entry
  web/            Next.js app (staff dashboard, POS, guest QR pages)
    app/          routes: (dashboard), (customer), (auth)
    features/     one folder per domain: pages, components, hooks, types
packages/
  db/             schema, migrations, seed, one-off maintenance scripts
  env/            API environment schema
  config/         shared TypeScript config
docs/             architecture, API reference, deployment, known issues
```

## Getting started

Requirements: Node 20+, a PostgreSQL database (a free [Neon](https://neon.tech) project works), and Midtrans sandbox keys (the API won't start without them).

```bash
npm install

cp apps/api/.env.example apps/api/.env              # fill in DATABASE_URL, secrets, Midtrans keys
cp apps/web/.env.local.example apps/web/.env.local  # JWT_SECRET must equal the API's

npm run db:push    # create the schema
npm run db:seed    # permissions + super-admin

npm run dev        # API on http://localhost:3000, web on http://localhost:3001
```

Sign in at http://localhost:3001/login as the seeded super-admin, `admin@system.local` / `Admin@123`, and change that password. To try a restaurant account, register one at `/register`; its first user becomes that restaurant's Admin.

## Scripts

Run from the repo root; Turborepo caches `build`, `check-types` and `lint`.

| Command | What it does |
| --- | --- |
| `npm run dev` | API and web in watch mode |
| `npm run dev:api` / `npm run dev:web` | one app only |
| `npm run build` | build every workspace |
| `npm run check-types` / `npm run lint` | type-check / lint every workspace |
| `npm run db:push` | sync the Drizzle schema to the database |
| `npm run db:seed` | seed permissions and the super-admin (idempotent) |
| `npm run db:studio` | browse the database |

API-only scripts, run from `apps/api` with `npx tsx`:

| Script | What it does |
| --- | --- |
| `src/scripts/check-permissions.ts` | end-to-end permission check against a running API (creates a throwaway tenant) |
| `src/scripts/gen-api-docs.ts` | regenerate `docs/api.md` from the controllers |
| `src/scripts/set-r2-cors.ts` | allow browser uploads to the R2 bucket (`npm run r2:cors`) |

## Documentation

- [Architecture](docs/architecture.md): how requests, permissions, multi-tenancy, guest sessions, bills and payments work.
- [API reference](docs/api.md): every route and the permission it requires (generated).
- [Deployment](docs/deployment.md): Vercel, environment variables, Midtrans and R2 setup.
- [Known issues](docs/known-issues.md): open problems, in priority order.
- [Guest menu design](docs/guest-menu-design.md): design reference for the QR ordering screens.
