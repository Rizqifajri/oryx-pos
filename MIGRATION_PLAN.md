# Migration Plan — dio-sys

What changed in the monorepo-merge + CRITICAL/HIGH-fix pass, what's deliberately left alone, and the recommended order for the next pass. See `ARCHITECTURE_AUDIT.md` for the full findings this is derived from, and `RBAC.md` (once written, in the RBAC-redesign phase below) for the target permission model.

## What changed this pass

1. **Monorepo merge.** `dio-sys-be` and `dio-sys-fe` combined into this repo via `git subtree` (full history preserved from both — see `README.md` for the layout). No behavior change.
2. **CRITICAL — restored tenant self-service authorization.** `PATCH/DELETE /tenants/me` had permission checks commented out. Added a new `tenant:manage-own` permission (distinct from the GLOBAL-only `tenant:manage`), wired it in, seeded it, and backfilled it onto existing tenant Admin/Owner roles. See `ARCHITECTURE_AUDIT.md` C1 for detail and verification.
3. **HIGH — backend.** Removed credential-logging in `validate.middleware.ts` (and fixed the adjacent live bug where Zod v4 error messages were silently degrading to a generic string). Fixed a non-atomic `role.service.ts` transaction. Hashed refresh tokens with bcrypt instead of storing them in plaintext.
4. **HIGH — frontend.** Fixed a 100x price display bug on the two real-money-facing screens (customer QR menu/cart, POS dashboard). Fixed a `RequirePermission` gate inconsistency on `/dashboard/users`. Removed a `NEXT_PUBLIC_JWT_SECRET` fallback in `proxy.ts` that could have leaked the JWT secret into the client bundle if that env var name were ever set.

Everything below was deliberately **not** touched this pass — either it needs a decision only you can make, or it's substantial enough to be its own phase.

---

## Pass 2 — Turborepo + end-to-end POS flow (2026-09-08)

Made the app actually build, run, and complete a real order→payment cycle.

1. **Turborepo.** Added `turbo.json` (cached `build`/`check-types`/`lint`, `^build` ordering, env-var hashing) and routed all root scripts through `turbo run`. Fixed the recursive `dev` script.
2. **Green build.** Deleted dead `components/charts/*` (broke `next build` — see step 1 of the old plan) and the dead files in `features/customer/*` (kept the live `use-public-order.ts` + `types`). Fixed axios return-type errors in `lib/api.ts`. `turbo run build check-types` is now green across all workspaces.
3. **Payment flow (was faked on both surfaces).** Decision taken: **POS immediate cash/counter** + **server-computed tax/service**.
   - Backend: `transactions` now stores `subtotal`/`tax_amount`/`service_amount`/`total_amount` (tax 10%, service 5%, computed in `utils/pricing.ts`). New atomic `POST /orders/checkout` creates an already-COMPLETED, paid order in one DB transaction. `transaction.service.createTransaction` now computes the breakdown and frees the table atomically (fixes M4).
   - POS (`pos-dashboard.tsx`) calls `/orders/checkout` instead of faking success; QR checkout (`(customer)/[tableId]/cart`) now **places the order and directs the customer to pay at the cashier** (removed the `setTimeout` fake-payment and the `[PAID]`-name hack). QR orders are settled by staff from the Orders board (NEW→PROCESSING→COMPLETED→record payment).
4. **Permission model reconciled.** The DB carried 71 permissions across two naming schemes; existing tenant Admin/Owner roles were badly under-provisioned (one had 1 of 51). Ran `packages/db/src/reconcile-permissions.ts` (idempotent): removed 10 orphaned `*:read`/`order:cancel` permissions, backfilled legacy transaction subtotals, and re-synced all 13 TENANT Admin/Owner roles to the full 51 non-global permissions. Frontend: removed the phantom `payment:*` perms and dead `ROLE_PERMISSIONS`/`ORDER_CANCEL` constants; the role editor now shows real Customer + Transaction groups.
5. **Customer QR pages were unreachable.** `proxy.ts` (Next 16 middleware) redirected `/<tableId>/menu` and `/<tableId>/cart` to `/login`. Added `isCustomerRoute()` so they're public and auth-agnostic; dashboard routes stay protected.

Verified end-to-end against the dev DB/server: POS checkout records subtotal+tax+service and frees the table; dine-in/QR order runs NEW→PROCESSING→COMPLETED→paid; invalid transitions rejected (400); cross-tenant read/create rejected (403); customer pages 200 while dashboard/POS stay 307.

**Still open** (unchanged from below): FK `onDelete` policy, `createdAt` as `date()` not `timestamp()`, migration-journal drift, the M1 privilege-escalation-via-role-reassign check, auth-transport hardening, and the pre-existing 14 lint errors (React-compiler `setState`-in-effect + `any`). None block running the app.

---

## Next: recommended order

### 1. Dead code cleanup (do this first — cheap, safe, unblocks a green build)

`apps/web/components/charts/*` (5 files, zero references anywhere) currently **breaks `next build`** with a real TypeScript error in `bar-interactive.tsx:130` (a `recharts` labelFormatter type mismatch). This isn't something introduced by the merge — it's pre-existing dead code. I left it in place this pass because dead-code removal was explicitly out of scope for the CRITICAL/HIGH-only pass, but it means `npm run build --workspace apps/web` doesn't currently succeed. Recommend deleting `components/charts/*` (nothing imports it) as the very next thing, purely to get a working build — after that, the rest of the dead-code list can be batched:

- `features/customer/*` (~7 files: `pages/menu.tsx`, `cart.tsx`, `payment.tsx`, `components/menu-view.tsx`, `menu-item-card.tsx`, `customer-header.tsx`, `hooks/use-place-order.ts`) — an entire unreferenced earlier version of the customer ordering flow, with hardcoded dummy data. The *live* flow is `app/(customer)/[tableId]/menu` + `.../cart`. Also contains a wrong-endpoint bug (posts to the staff-only `POST /orders` instead of `POST /orders/public`) that would resurface if anyone "restored" this code without noticing.
- Duplicate `/dashboard` route (`app/(dashboard)/dashboard/page.tsx` and `app/(dashboard)/page.tsx` render the same component) — pick one.
- Duplicate "list all permissions" hook (`features/role/hooks/use-permissions-api.ts` vs `features/permission/hooks/use-permissions.ts`) — consolidate to one.
- Unused `ROLE_PERMISSIONS` constant (`constants/permissions.ts:107-169`) that mirrors backend role grants client-side — delete it before a future dev wires it in as a "fallback" and it drifts from the DB-driven source of truth.
- Backend: dead `UserContext.roles` field (always `[]`, never read); duplicated `generateSlug`/`generateRandomSuffix` between `auth.service.ts` and `tenant.service.ts`.

### 2. Pre-existing lint failures (separate from the merge, needs real triage)

`npm run lint --workspace apps/web` currently reports 14 errors / 18 warnings, all pre-existing (I didn't introduce or touch any of these files this pass). Bulk of the errors are `react-hooks/set-state-in-effect` (React Compiler flagging synchronous `setState` inside `useEffect` across ~6 files: `components/side-bar.tsx`, `features/auth/hooks/use-permissions.ts`, `features/cart/context/cart-context.tsx`, `hooks/use-mobile.ts`, and others) plus a couple `react-hooks/incompatible-library` warnings on `react-hook-form`'s `watch()`. Worth a dedicated pass rather than spot-fixes, since the React Compiler warnings share a root cause (initializing state from `localStorage`/`window` inside an effect instead of lazy `useState` initializers) that's worth fixing consistently.

### 3. RBAC redesign — `user_tenants` membership model

Current model: `users.tenantId` + `users.roleId`, single tenant per user. Works, and is internally consistent (verified: tenant isolation is correctly enforced at the service layer across all 9 non-tenant modules). But it doesn't support the doc's target model of one person holding different roles across different tenants (`Restaurant A → OWNER`, `Restaurant B → MANAGER`). If that's a real product requirement, this is the highest-effort item on this list: new `user_tenants` join table, migrate existing `users.tenantId`/`roleId` into it, rewrite `UserContext`/JWT payload to carry the *active* tenant membership rather than a fixed one, update every service's tenant-scoping check. Needs a decision on whether multi-tenant membership is actually needed before starting — if every user really does belong to exactly one tenant in practice, this may not be worth the churn.

### 4. Migration journal / schema-as-code drift

`packages/db/src/migrations/meta/_journal.json` only tracks migrations `0000`–`0003`; `0004_nullable_tenant_for_global.sql` and `0005_optional_table_for_orders.sql` exist as files but aren't registered, so `drizzle-orm`'s migrator doesn't know about them. `packages/db/fix-role-permissions.sql` is an orphaned one-off hotfix script outside the migrations folder entirely (`DROP TABLE role_permissions CASCADE; CREATE TABLE ...`) — evidence of manual out-of-band schema patching. Separately, migration `0004` hand-adds a Postgres CHECK constraint (`role_tenant_scope_check`: GLOBAL⇒tenant_id NULL, TENANT⇒tenant_id NOT NULL) that isn't represented in the Drizzle TS schema (`role.ts`), so a future `drizzle-kit push` diff could silently drop it.

Recommended approach: confirm whether `db:push` (declarative, what `README.md` documents as the primary workflow) or `db:migrate` (journal-based) is the actual source of truth going forward — the project currently straddles both inconsistently. Once decided: if `db:push`, delete the stale migration files and the orphaned hotfix script, and add the CHECK constraint to `role.ts` via Drizzle's `.check()` so `db:push` stops being able to silently drop it. If `db:migrate`, regenerate a clean baseline via `drizzle-kit generate` against the current live schema.

### 5. Payment / checkout architecture (needs a product decision, not an engineering one)

The customer QR checkout (`app/(customer)/[tableId]/cart/page.tsx`) invents a client-side 10% tax + 5% service charge with no backend counterpart (`totalPrice` is server-computed from menu prices only — no tax/service concept exists in the schema or API), shows the inflated total to the customer as "Total Bayar," then fakes payment success via `setTimeout(...)` — there's no call to `POST /transactions` anywhere in this flow. The order gets created (correctly, via `POST /orders/public`), but the amount actually shown/promised to the customer is never recorded anywhere.

This needs you to decide: is there a real payment gateway planned (Midtrans, Xendit, etc. — common for Indonesian dine-in systems), or is the intended flow "customer orders via QR, pays cash at the counter, staff creates the `Transaction` record from the POS/dashboard after collecting payment"? The fix looks completely different depending on the answer, and guessing wrong means redoing it. If tax/service charges are a real business requirement, they also need to become a real, server-computed part of `totalPrice` (or a separate field), not a client-side decoration.

### 6. Auth transport hardening

Access + refresh tokens currently live in `localStorage` (`lib/api.ts`) plus a duplicate non-`httpOnly` cookie (`proxy.ts` needs to read a cookie since Next.js middleware can't read `localStorage`) — both are XSS-exfiltratable. The frontend also holds the same symmetric `JWT_SECRET` as the backend to verify tokens locally at the edge, which is architecturally fragile (anything that can read that env var, or the built middleware bundle, can forge tokens for any user).

Real fix is a coordinated FE+BE change: move to `httpOnly`, `Secure`, `SameSite` cookies set by the backend on login (eliminating the need for the frontend to handle raw tokens at all), and either drop local edge-verification in favor of a lightweight backend `/auth/verify` call, or move to RS256 (frontend holds only a public key, never the signing secret). Bigger scope than a spot-fix; pair with the RBAC redesign if that's also happening, since both touch the auth/JWT payload shape.

### 7. Test suite

Neither app has a test runner configured. No regression safety net exists for any of the fixes in this pass or future refactors — everything above was verified manually against the dev DB / dev server, not via automated tests. Recommend starting with the doc's §27 priorities once a framework is chosen (Vitest fits both an Express + TS backend and a Next.js frontend):
- Tenant isolation: Tenant A creates a resource, Tenant B's request for it must fail.
- RBAC: permission-holder allowed, non-holder forbidden, GLOBAL bypass works.
- Order state machine: valid transitions succeed, invalid ones are rejected, price is always server-computed.

### 8. Remaining MEDIUM/LOW items

Full list with file:line references is in `ARCHITECTURE_AUDIT.md`. Notable ones not covered above:
- No FK `onDelete` cascade/restrict policy anywhere (deleting a tenant/category/role with dependents raises a raw Postgres FK error as a generic 500) — becomes more visible now that `DELETE /tenants/me` is actually reachable again (fix #C1 above). Worth prioritizing alongside the migration-journal work in step 4.
- Any `user:manage` holder can reassign another user's role to a higher-privilege one in the same tenant, with no check that the actor's own permissions are a superset.
- `createdAt` uses Drizzle `date()` (day-only) instead of `timestamp()` on every table.
- Missing Drizzle relations for the entire order domain.
- Redundant client-computed `tenantId` sent on ~6 frontend create calls (harmless — backend independently validates it — but worth removing to reduce duplicated logic).
