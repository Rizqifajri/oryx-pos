# Deploying to Vercel

This is a Turborepo monorepo. Create **two separate Vercel projects** from the
same Git repo — one per app — each with its own **Root Directory**.

## 1. Backend project — `apps/server` (Express as a serverless function)

- **New Project → import this repo.**
- **Root Directory:** `apps/server`
- Framework preset: **Other**. Build/Output can be left default — `api/index.ts`
  is auto-detected as a serverless function and `vercel.json` rewrites every
  path to it, so Express keeps its `/api/v1/...` routing.
- **Environment variables** (Production + Preview):

  | Var | Value / notes |
  | --- | --- |
  | `DATABASE_URL` | Neon connection string (pooled) |
  | `JWT_SECRET` | ≥ 32 chars |
  | `JWT_REFRESH_SECRET` | ≥ 32 chars |
  | `JWT_EXPIRES_IN` | optional (default `24h`) |
  | `JWT_REFRESH_EXPIRES_IN` | optional (default `7d`) |
  | `CORS_ORIGIN` | the **web** project's URL, e.g. `https://dio-sys-web.vercel.app` |
  | `R2_ACCOUNT_ID` `R2_ACCESS_KEY_ID` `R2_SECRET_ACCESS_KEY` `R2_BUCKET_NAME` `R2_PUBLIC_URL` | required for image uploads |
  | `NODE_ENV` | `production` |

## 2. Frontend project — `apps/web` (Next.js)

- **New Project → import the same repo again.**
- **Root Directory:** `apps/web`
- Framework preset: **Next.js** (auto-detected).
- **Environment variables:**

  | Var | Value / notes |
  | --- | --- |
  | `NEXT_PUBLIC_API_URL` | the **backend** URL + `/api/v1`, e.g. `https://dio-sys-api.vercel.app/api/v1` |
  | `JWT_SECRET` | **must equal the server's** — `proxy.ts` verifies the JWT, or logins bounce to `/login` |

## 3. The URL chicken-and-egg

Web needs the server URL; the server's `CORS_ORIGIN` needs the web URL. Deploy
both once to mint their `*.vercel.app` URLs, fill in the two cross-referencing
vars, then redeploy both.

## 4. After first deploy

- **R2 CORS:** allow the production web origin so browser presigned uploads work:
  `npm run r2:cors --workspace apps/server -- https://<web-domain>`
- **Permissions:** run the reconcile script against the prod DB if roles need it.

## Known caveats

- **Preview deployments get unique URLs.** `CORS_ORIGIN` is a single origin, so
  preview web builds will be blocked by the API's CORS. If you need previews to
  work, widen `apps/server/src/app.ts` CORS to accept a list / regex of origins.
- Express runs statelessly per invocation — no background jobs, websockets, or
  in-memory state. Cold starts apply.
