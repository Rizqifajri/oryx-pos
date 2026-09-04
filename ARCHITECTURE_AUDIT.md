# Architecture Audit — dio-sys

Phase 1 deliverable per `docs/Recovery Agent Prompt.md`. Produced from two independent read-only audits (backend: 53 tool calls; frontend: 68 tool calls) run against the pre-merge `dio-sys-be` / `dio-sys-fe` repositories, then spot-verified against source directly before any fix was made. All file paths below are given relative to their new locations in this monorepo (`apps/server/...`, `apps/web/...`, `packages/db/...`).

Severity: **CRITICAL** (auth/tenant-isolation bypass, data corruption) → **HIGH** (broken business rule, real user-facing defect) → **MEDIUM** (inconsistency/tech debt/architectural risk) → **LOW** (naming/style/dead code).

Items marked **[FIXED]** were corrected in this pass. Everything else is deferred — see `MIGRATION_PLAN.md` for rationale and sequencing.

---

## Verification corrections

Three findings from the raw sub-agent audits did not survive cross-checking against the other side of the stack, and are recorded here rather than in the tables below so they aren't mistaken for open issues:

1. **Not an IDOR**: the frontend sends client-computed `tenantId` on most create requests. Originally flagged CRITICAL (possible cross-tenant write). Verified false — every backend service (`order.service.ts:90-94`, `menu.service.ts:99-106`, `category.service.ts:77-87`, and equivalents in `table`, `customer`, `user`, `role`) independently re-derives tenant context from the authenticated JWT and rejects any mismatch with the client-sent value. Real issue is just redundant/duplicated client logic (six near-identical `tenantId` fallback implementations) — MEDIUM, deferred.
2. **Not a dropped field**: POS "Create Order" sends `customerName`/`customerPhone`, flagged as an undocumented field that might be silently discarded by a stricter typed staff endpoint. Verified false — `order.schema.ts:19-20` accepts both, and `order.service.ts:115-121` finds-or-creates a `customers` row and links it. Actual gap is just that `docs/BACKEND_API.md` doesn't document these two fields on `POST /orders` — LOW, doc-only.
3. **Not a live casing bug**: `features/dashboard/lib/shared.ts`'s `normalizeOrderStatus()` defensively maps `PENDING→NEW`/`CANCELLED→CANCELED`, suggesting the backend might emit those values. Verified false — the Postgres enum and `order.schema.ts:3-8` only ever produce `NEW|PROCESSING|COMPLETED|CANCELED`. The normalization code is unnecessary, not a compensating fix for a real contract mismatch — LOW cleanup, deferred.

---

## CRITICAL

| # | Finding | Location | Status |
|---|---|---|---|
| C1 | `PATCH /tenants/me` and `DELETE /tenants/me` had their `requirePermission(...)` calls commented out, so any authenticated tenant user of any role (not just an Admin) could rename or delete their own tenant. Root cause: `tenant:view/update/delete/manage` are hardcoded into `GLOBAL_ONLY_PERMISSIONS`, so no tenant-scoped role could ever legitimately hold them — the check was likely commented out as a workaround for tenant owners being locked out, not carelessness. | `apps/server/src/modules/tenant/tenant.routes.ts:43-49,60-65`; `apps/server/src/constants/permissions.ts` | **[FIXED]** — new non-global `tenant:manage-own` permission added, seeded, wired to the routes, and backfilled onto existing tenant roles. Verified end-to-end against the dev DB: a `Staff Gudang` role (no `tenant:manage-own`) gets `403 Missing required permission: tenant:manage-own`; an `Admin` role (has it) gets `200`. Backfill query targeted `scope='TENANT' AND name IN ('Admin','Owner')` — 10 `Admin`-named roles matched the plan's original criteria, plus 4 legacy `Owner`-named roles were found during verification (older naming convention for the same tenant-creator/full-access role, confirmed by permission-count and tenant-ownership inspection) and included, since withholding the same narrow, blast-radius-limited self-service permission from them would leave 4 real tenants still locked out. Custom tenant-created roles (e.g. `Staff`, `Staff Gudang`) were left untouched, per plan. |

## HIGH

| # | Finding | Location | Status |
|---|---|---|---|
| H1 | Every request and every validation failure logged the raw `req.body` to stdout via `console.log`/`console.error`, including plaintext passwords on `/auth/login` and `/auth/register`. | `apps/server/src/middlewares/validate.middleware.ts:11,19` | **[FIXED]** — logging removed. |
| H2 | `role.service.ts` `createRole`/`updateRole` wrap `db.transaction(...)` but call repository functions that use the module-level `db`, not the `tx` param — the role row commits immediately outside the transaction, so a failure in the permission-sync step leaves a role with no/stale permissions instead of rolling back cleanly. | `apps/server/src/modules/role/role.service.ts:110-122,162-174`; `role.repository.ts:65-84` | **[FIXED]** — `tx` threaded through `roleRepo.createRole`/`updateRole`. |
| H3 | Refresh tokens stored in plaintext in `users.refresh_token`; a DB leak makes every active session directly usable (unlike passwords, which are bcrypt-hashed). | `packages/db/src/schema/user.ts:17`; `apps/server/src/modules/auth/auth.repository.ts` | **[FIXED]** — tokens hashed with bcrypt before storage; lookup switched from equality-on-raw-token to `findUserById` (from the verified JWT's `sub`) + `bcrypt.compare`. |
| H4 | Real-money price display off by 100x on the two customer/cashier-facing surfaces that actually handle payment: menu prices are stored as integer cents, admin screens correctly divide by 100, but the customer QR menu/cart and the POS dashboard did not. | `apps/web/features/pos/pages/pos-dashboard.tsx:27-33`; `apps/web/app/(customer)/[tableId]/menu/page.tsx:49-55`; `apps/web/app/(customer)/[tableId]/cart/page.tsx:34-39` | **[FIXED]** — `formatPrice` in all three now divides by 100. |
| H5 | `/dashboard/users` page's `RequirePermission` omitted `requireAll={false}`, defaulting to `true` — a `user:view`-only role was denied the page entirely, inconsistent with the equivalent `roles` page which explicitly sets `requireAll={false}`. | `apps/web/app/(dashboard)/users/page.tsx:8` | **[FIXED]** |
| H6 | `proxy.ts` fell back to `process.env.NEXT_PUBLIC_JWT_SECRET` before `JWT_SECRET`. Any `NEXT_PUBLIC_`-prefixed env var is inlined into the client bundle by Next.js — if this fallback name were ever set (an easy mistake given the existing `NEXT_PUBLIC_API_URL` convention), the JWT signing secret would ship to every browser. No active leak today (`.env.local` only defines the non-prefixed name), but the code invited the mistake. | `apps/web/proxy.ts:21-23` | **[FIXED]** — fallback removed, reads only `JWT_SECRET`. |
| H7 | Migration journal drift: `0004_nullable_tenant_for_global.sql` / `0005_optional_table_for_orders.sql` exist but aren't registered in `meta/_journal.json`, so `drizzle-orm`'s migrator doesn't know about them; an orphaned one-off hotfix script (`fix-role-permissions.sql`) sits outside the migrations folder entirely, evidence of manual out-of-band schema patching. A hand-added Postgres CHECK constraint (`role_tenant_scope_check`) from migration `0004` isn't represented in the Drizzle TS schema, so a future `drizzle-kit push` diff could silently drop it. | `packages/db/src/migrations/meta/_journal.json`; `packages/db/fix-role-permissions.sql`; `packages/db/src/schema/role.ts` | Deferred — see `MIGRATION_PLAN.md`. Needs a deliberate baseline-regeneration decision, not a quick patch. |
| H8 | Zero automated test coverage in either app; no test runner is even a dependency. No regression safety net for any of the fixes in this pass or future refactors. | repo-wide | Deferred — see `MIGRATION_PLAN.md`. |
| H9 | Customer QR checkout invents a client-side 10% tax + 5% service charge with no backend counterpart (`totalPrice` is server-computed from menu prices only), displays the inflated total as "Total Bayar," then fakes payment success via `setTimeout(...)` with no call to `POST /transactions` — the order is created but the amount shown to the customer is never recorded anywhere backend-side. | `apps/web/features/cart/hooks/use-payment-calculation.ts`; `apps/web/app/(customer)/[tableId]/cart/page.tsx:47-73` | Deferred — needs a product decision (real payment gateway vs. cash-at-counter with staff-recorded `Transaction`) before it can be fixed rather than re-guessed. See `MIGRATION_PLAN.md`. |

## MEDIUM

| # | Finding | Location |
|---|---|---|
| M1 | Any user holding `user:update`/`user:manage` can reassign another user's `roleId` to any role in the tenant, including a higher-privilege one — no check that the actor's own permissions are a superset of the target role's. | `apps/server/src/modules/user/user.service.ts:127-175` |
| M2 | `requireAuth`/`requireGlobal` throw a plain `Error` instead of `AppError`, so an unauthenticated request to those routes returns 500 instead of 401. | `apps/server/src/middlewares/require-auth.middleware.ts:10`; `require-global.middleware.ts:11` |
| M3 | JWT bakes in a `permissions[]` snapshot at login/refresh time; role/permission changes don't take effect until token expiry (up to 24h) or an explicit refresh. | `apps/server/src/modules/auth/auth.service.ts` |
| M4 | `transaction.service.createTransaction` performs the transaction insert and the table-free-up update as two non-atomic writes — a failure between them leaves a paid order with an occupied table. | `apps/server/src/modules/transaction/transaction.service.ts:80-90` |
| M5 | A `COMPLETED` order only frees its table via `Transaction` creation; deleting a `Transaction` doesn't revert order status — reachable dead-end states. | `apps/server/src/modules/order/order.service.ts:190-194`; `transaction.service.ts:95-103` |
| M6 | Only `req.body` is Zod-validated; `req.params`/`req.query` (e.g. `:id`, `?tenantId=`) are not, so a malformed UUID surfaces as a raw 500. | all `*.routes.ts`/`*.controller.ts` |
| M7 | No DB-level tenant filtering on repository by-id lookups — tenant isolation is currently consistently enforced at the service layer (verified across all 9 non-tenant modules), but there's no structural guard against a future route bypassing that check. | e.g. `order.repository.ts:91-118`; `menu.repository.ts:47-90` |
| M8 | No FK `onDelete` cascade/restrict policy anywhere — deleting a tenant/category/role with dependents raises a raw Postgres FK error surfaced as a generic 500. | all `packages/db/src/schema/*.ts` |
| M9 | `createdAt` uses Drizzle `date()` (day-only) instead of `timestamp()` on every table, losing time-of-day precision. | all `packages/db/src/schema/*.ts` |
| M10 | No `helmet`/security headers, no rate limiting anywhere, including public `/auth/register`, `/auth/login`, `/orders/public`. | `apps/server/src/app.ts` |
| M11 | Missing Drizzle relations for the entire order domain (orders, orderItems, menus, categories, tables, customers, transactions) — only role/tenant/user relations defined. | `packages/db/src/relations/*.ts` |
| M12 | Redundant client-side `tenantId` resolution logic copy-pasted near-identically in 6 frontend files (harmless per the verification above, but multiplies the blast radius of any future change). | `apps/web/features/{table,menu,user,role}/**`, `pos-dashboard.tsx` |
| M13 | `formatPrice` reimplemented independently in 9+ files with two incompatible unit conventions before this pass's fix. | various, see H4 |
| M14 | Frontend `localStorage`-stored access/refresh tokens plus a non-`httpOnly` JS-readable cookie (XSS-exfiltratable session); frontend also holds the same symmetric JWT secret as the backend to verify tokens locally at the edge. | `apps/web/lib/api.ts`; `apps/web/proxy.ts` |
| M15 | Unused `ROLE_PERMISSIONS` constant fully mirrors the backend's role→permission grant matrix client-side — dead today, but a landmine if a future dev wires it in as a "fallback" (would drift from the DB-driven source of truth). | `apps/web/constants/permissions.ts:107-169` |

## LOW

- Dead code: entire unreferenced `features/customer/*` module (~7 files, hardcoded dummy data, wrong-endpoint bug preserved inside it), unused `components/charts/*` (5 files), duplicate `/dashboard` and `/` routes rendering the same page, duplicate "list all permissions" hook implemented independently in two features.
- `UserContext.roles` field always `[]`, never read.
- Duplicated `generateSlug`/`generateRandomSuffix` between `auth.service.ts` and `tenant.service.ts`.
- Naming: `user.route.ts` (singular) vs. every other module's `*.routes.ts` (plural).
- No unique constraints on `permissions.name`, `roles(tenantId, name)`, `categories(tenantId, name)`, `customers(tenantId, phone/email)`.
- `order_items` has no `tenant_id` column — correct today (all queries join through `orders`), but a latent trap for a future direct query.
- Boilerplate `app/layout.tsx` metadata still reads "Create Next App."
- `constants/permissions.ts` (frontend) and `docs/BACKEND_API.md` should document `tenant:manage-own` (new in this pass) and the previously-undocumented `customerName`/`customerPhone` fields on `POST /orders`.

---

## What this confirms is *solid* (preserve, don't rebuild)

- Route → controller → service → repository layering is consistent across all 10 backend modules; controllers never touch Drizzle directly.
- `AppError` + single `errorHandler` gives a consistent JSON error shape almost everywhere.
- Zod validation at the body boundary is applied consistently via one `validate()` middleware.
- The order status state machine (`NEW→PROCESSING→COMPLETED`, `NEW/PROCESSING→CANCELED`) is enforced server-side, not client-arbitrary, and price totals are always computed server-side from menu prices, never trusted from client input.
- Frontend: single shared Axios instance with auth/error interceptors, centralized `usePermission`/`<Can>`-style guards (`components/guards/*`), TanStack Query key factories per feature, feature-oriented folder structure — the recovery doc's target architecture for these areas is already substantially in place.
