# Known issues

Open problems, most important first. Each one was checked against the code as of October 2026.

## Security

1. **Role escalation inside a tenant.** Anyone with `user:update` or `user:manage` can give another user (or themselves) any role in the tenant, including one with more permissions than their own. Fix: in `user.service.ts`, refuse a role whose permissions aren't a subset of the caller's.
2. **Tokens readable by JavaScript.** Access and refresh tokens live in `localStorage` and a non-`httpOnly` cookie, so a cross-site-scripting bug would leak them. The web app also holds `JWT_SECRET` to verify tokens in `proxy.ts`, so anything that can read the web app's environment can forge tokens. Fix: `httpOnly` cookies set by the API, and RS256 (or an API call) instead of a shared secret.
3. **No rate limiting or security headers.** This includes the public `/auth/login`, `/auth/register` and `/public/*` routes. Fix: `@nestjs/throttler` and `helmet`.

## Data

4. **Deletes with dependents fail with a 500.** No foreign key has an `onDelete` rule, so deleting a tenant, category or role that still has rows pointing at it raises a raw Postgres error.
5. **Day-only creation dates.** `created_at` is a `date` (no time of day) on 10 tables. Newer tables (sessions, bills, payments, service requests) use `timestamp`.
6. **Migrations out of sync.** `packages/db/src/migrations/meta/_journal.json` registers 5 of the 10 SQL migrations, and `packages/db/fix-role-permissions.sql` is a manual hotfix outside the migrations folder. `db:push` is the working path; either commit to it and delete the stale migrations, or regenerate a clean baseline and use `db:migrate`.

## Operations

7. **Midtrans Snap is hard-coded to sandbox** in `apps/web/app/layout.tsx`. Live payments won't open until it points at `app.midtrans.com` (see [deployment](deployment.md#4-midtrans)).
8. **Realtime is single-instance.** The SSE event bus is in memory. With several API instances, or on serverless, guests get most updates by polling instead. Fix: Postgres `LISTEN/NOTIFY` or Redis pub/sub.
9. **One CORS origin.** Preview deployments of the web app are blocked by the API.
10. **UI lags behind role changes by up to 5 minutes.** The API applies a role change immediately, but the web app caches `/auth/me` for 5 minutes, so menus and pages can stay out of date until then.

## Quality

11. **No test suite.** `apps/api/src/scripts/check-permissions.ts` is the only automated check, an end-to-end permission test against a running API. The obvious first tests are tenant isolation, role permissions, and the order and bill state machines.
12. **Remaining lint errors (4)** are React-Compiler `set-state-in-effect` warnings in form-reset effects and the cart context, plus one `as any` on a form resolver. They don't affect behaviour.
