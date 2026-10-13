# Architecture

## Overview

```
 Staff browser ──(Bearer JWT)──┐
                               ├──▶ apps/api  (NestJS, /api/v1) ──▶ PostgreSQL
 Guest phone ──(guest token)───┘        │
                                        ├──▶ Midtrans  (Snap payments, webhook back in)
 Browser ──(presigned PUT)─────────────▶ Cloudflare R2  (menu photos)
```

`apps/web` is a Next.js app with four route groups:

| Group | Who | Auth |
| --- | --- | --- |
| `app/(auth)` | login, register | none |
| `app/(dashboard)` | staff dashboard and POS | staff JWT; `proxy.ts` redirects to `/login` without one |
| `app/(public)` | guest QR pages: `/order/[tenantSlug]/[tableToken]` (menu, cart, bill, help) | guest token |
| `app/(customer)` | Midtrans return pages: `/payment/finish`, `/pending`, `/error` | none |

## Backend layout

Each domain in `apps/api/src/modules/<name>/` has the same layers:

- `*.controller.ts`: routes, permission decorators, Zod body validation (`ZodValidationPipe` + `*.schema.ts`).
- `*.service.ts`: business rules, tenant checks, transactions.
- `*.repository.ts`: Drizzle queries only. Every repository lives in `RepositoriesModule` so services can use each other's repositories without circular module imports.

Errors are thrown as `AppError(message, status)` and turned into `{ success: false, message }` by `AllExceptionsFilter`. Successful responses are `{ success: true, data }`; the web client (`lib/api.ts`) unwraps `data`.

## Authentication

1. `POST /auth/login` returns an access token (default lifetime 24h) and a refresh token (7d). The refresh token is stored as a SHA-256 hash, and each refresh rotates it, so an older refresh token stops working.
2. The web app keeps both tokens in `localStorage`, and copies the access token into a cookie so `proxy.ts` (Next.js middleware) can protect dashboard routes.
3. On a 401 from any request other than login, register or refresh, `lib/api.ts` refreshes once and retries; if that fails it clears the session and goes to `/login`. A 401 from login itself is returned to the form as "wrong email or password".

## Permissions

The model is **user → one role → many permissions**. Permissions are strings named `resource:action`, for example `menu:list` or `order:create`.

| Action | Meaning |
| --- | --- |
| `list` | read the collection, which is what opens a page |
| `view` | read one record |
| `create` / `update` / `delete` | a single kind of write |
| `manage` | shortcut for all writes. It does **not** grant `list` or `view` |
| `manage-own` | `tenant:manage-own` only: edit your own restaurant's settings |

**Enforcement (API).** Routes declare `@RequirePermissions("menu:manage", "menu:create")`; a caller needs **any one** of the listed permissions. `JwtAuthGuard` uses the token only to identify the user. It reads the user's scope and permissions **from the database on every request**, so a role change applies immediately, including revoking a permission. `PermissionsGuard` then checks them.

**Scopes.** A role is either `GLOBAL` (platform super-admin; passes every permission check and sees every tenant) or `TENANT` (scoped to one restaurant). Permissions in `GLOBAL_ONLY_PERMISSIONS` (`apps/api/src/common/constants/permissions.ts`), such as `tenant:create` or `permission:update`, can never be given to a tenant role. `GET /permissions` hides them from tenant users, and role create/update rejects them.

**UI.** The web app reads permissions from `GET /auth/me` (the same database data the guard uses). Each sidebar item, page guard (`RequirePermission`) and dashboard card asks for the permission its own API calls need, usually `*:list`, so a role that can open a page always sees the link, and never the other way round. The role editor builds its checkboxes from `GET /permissions`, so every box maps to an assignable permission.

**New restaurants.** `POST /auth/register` creates the tenant, an `Admin` role holding every non-global permission, and the first user.

To verify all of this against a running API: `npx tsx src/scripts/check-permissions.ts` (from `apps/api`).

## Multi-tenancy

Every tenant-owned row has a `tenant_id`. The tenant always comes from the caller's identity (the staff user's `tenantId`, or the guest token), never from the request body alone. Services compare it against the resource with `assertTenantMatch`. GLOBAL users may pass a `tenantId` to act on a specific restaurant; that is what the tenant filter in the dashboard sends.

## Money

All amounts are **integer cents** in the database and on the wire; the web app formats them with `formatIdr` (`lib/format.ts`). Tax (10%) and service (5%) are computed only on the server (`common/utils/pricing.ts`). Order prices are re-computed from the menu on every submit, so prices sent by the client are never trusted.

## Dine-in flow: table sessions and bills

```
guest scans QR ─▶ table session (open) ─▶ rounds of orders ─▶ bill locked (billing) ─▶ paid (closed)
                         ▲                                         │
POS dine-in order ───────┘                       cancel/expire ◀───┘ back to open
```

- **Table session**: one visit at a table. The first scan of `POST /public/tables/:qrToken/session` opens it, and later scans join it; each device gets a **guest token**. POS dine-in orders go onto the same session, so guests see them on their phones.
- **Orders**: a guest round can be withdrawn only until the kitchen accepts it. Staff move orders through `NEW → PROCESSING → COMPLETED`.
- **Bill**: `open` (a live preview) → `locked` (totals frozen, no new orders, payment in progress) → `paid` (one `transaction` per order, session closed, table freed). Every transition runs in a database transaction holding the bill row lock (`bill.service.ts`).
- **Split bill**: a locked bill can be split evenly, by items, or by custom amounts; shares are paid one at a time, online or at the cashier. When the last share is paid the bill settles exactly like a full payment (`split.service.ts`).
- **Staff tools** (`staff-session.service.ts`): settle at the cashier, move the party to another table, merge two tabs, unlock a stuck bill, close a session without payment.
- **Guest requests**: `call_waiter`, `water`, `cutlery`, `bill`, `move_table`, shown on the Orders page until handled.

Takeout orders from the POS have no session; they are paid when completed on the Orders board.

## Payments (Midtrans)

1. The API creates a Snap transaction and stores a `payment_request` (`bill.service.ts` for table bills and shares, `payment.service.ts` for single orders). A pending, unexpired request for the same amount is reused, so a double tap never charges twice.
2. The browser opens the Snap popup (`window.snap`, loaded in `app/layout.tsx`), falling back to Midtrans's redirect URL.
3. Midtrans calls `POST /payments/webhook`; the API verifies the signature and marks the request paid, which settles the bill.
4. While a guest waits, polling `GET /public/payments/:paymentId` re-checks pending payments with Midtrans, so a missed webhook doesn't leave a bill stuck. The client never marks anything paid itself.

## Realtime

Guests receive live updates over Server-Sent Events: `GET /public/sessions/:sessionId/events`, with the guest token in the query string because `EventSource` can't send headers. Events include `order.updated`, `bill.updated`, `payment.updated`, `session.moved`, `session.merged`, `menu.updated` and others. An event is only a hint, and the client refetches the session when it gets one. Staff screens poll every 10 seconds.

The event bus (`common/realtime/session-events.service.ts`) is in-process, so events reach only clients connected to the same API instance. On serverless or with several instances, guests fall back to polling; see [known issues](known-issues.md).

## Image uploads

The browser asks `POST /uploads/menu` for a presigned URL (JPEG/PNG/WebP/GIF, ≤ 5 MB, key `menus/<tenantId>/<uuid>.<ext>`), then PUTs the file straight to R2; it never passes through the API. Without the `R2_*` variables that endpoint returns 503 and the rest of the app works normally.

## Database

The schema lives in `packages/db/src/schema/*.ts`. The day-to-day workflow is `npm run db:push`, which syncs the schema directly. `packages/db/src` also holds idempotent maintenance scripts: `seed.ts`, `reconcile-permissions.ts`, `fix-invalid-image-urls.ts`.
