# Deployment

The repo deploys as **two Vercel projects** from the same Git repository, one per app, each with its own **Root Directory**.

## 1. API: `apps/api`

- **Root Directory:** `apps/api`. **Framework preset:** Other.
- `api/index.ts` is picked up as a serverless function, and `vercel.json` rewrites every path to it, so routes stay under `/api/v1/...`. The Nest app is built once per warm container and reused.
- `src/main.ts` is the long-running entry point if you later move to a container or VPS; both entry points share `src/bootstrap.ts`.

Environment variables (Production and Preview). `packages/env` validates them at startup, so a missing or malformed value fails the boot instead of the first request.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string (Neon: use the pooled one) |
| `JWT_SECRET` | yes | ≥ 32 characters; must equal the web app's |
| `JWT_REFRESH_SECRET` | yes | ≥ 32 characters, different from `JWT_SECRET` |
| `JWT_EXPIRES_IN` | no | default `24h` |
| `JWT_REFRESH_EXPIRES_IN` | no | default `7d` |
| `CORS_ORIGIN` | yes | the web app's URL, e.g. `https://oryx-web.vercel.app` (one origin) |
| `MIDTRANS_SERVER_KEY` | yes | the API won't start without it |
| `MIDTRANS_CLIENT_KEY` | yes | |
| `MIDTRANS_IS_PRODUCTION` | no | `true` / `false` (default `false`) |
| `FRONTEND_URL` | no | the web app's URL; where Midtrans sends the guest after paying |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | for photos | without them, menu image upload returns 503 |
| `NODE_ENV` | no | `production` |

## 2. Web: `apps/web`

- **Root Directory:** `apps/web`. **Framework preset:** Next.js.

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | the API URL plus `/api/v1`, e.g. `https://oryx-api.vercel.app/api/v1` |
| `JWT_SECRET` | **must equal the API's.** `proxy.ts` verifies the token, and a mismatch bounces every login back to `/login` |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | the same client key as the API |

## 3. First deploy

Each app needs the other's URL. Deploy both once to get their `*.vercel.app` URLs, set `CORS_ORIGIN` / `FRONTEND_URL` on the API and `NEXT_PUBLIC_API_URL` on the web app, then redeploy both.

Then, once per environment:

```bash
# from the repo root, with DATABASE_URL pointing at that environment
npm run db:push
npm run db:seed          # permissions + super-admin; change its password right away

# from apps/api: allow browser uploads to the bucket from the web origin
npm run r2:cors -- https://<web-domain>
```

## 4. Midtrans

1. Get keys from the [sandbox dashboard](https://dashboard.sandbox.midtrans.com/) (live: [dashboard.midtrans.com](https://dashboard.midtrans.com/)) under **Settings → Access Keys**.
2. Under **Settings → Configuration → Payment Notification URL**, set `https://<api-domain>/api/v1/payments/webhook`. This is how payments get marked paid; guest polling also re-checks pending payments, but don't rely on that alone. To receive the webhook on your machine, expose port 3000 with a tunnel such as `ngrok http 3000`. Delivery attempts are listed per transaction in the Midtrans dashboard.
3. Sandbox test card: `4811 1111 1111 1114`, any future expiry, CVV `123`, OTP `112233`.
4. **Before going live:** besides `MIDTRANS_IS_PRODUCTION=true` and the live keys, change the Snap script in `apps/web/app/layout.tsx` from `app.sandbox.midtrans.com` to `app.midtrans.com`. It is hard-coded to sandbox today.

## Caveats on Vercel

- `CORS_ORIGIN` accepts one origin, so preview deployments of the web app are blocked by the API. To allow them, widen `enableCors` in `apps/api/src/bootstrap.ts` to a list or a pattern.
- Functions are stateless, so live guest updates over SSE only reach clients on the same instance and guests mostly fall back to polling. A container or VPS deployment (`src/main.ts`) doesn't have this limit.
