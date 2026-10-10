// Vercel serverless entrypoint. Vercel treats any file under `api/` as a
// function, and `vercel.json` rewrites every path here so Nest keeps its
// `/api/v1/...` routing.
//
// The Nest app is initialised once and cached on the module scope: a warm
// container reuses it instead of rebuilding the DI container per request.
// `app.init()` (never `app.listen()`) is what wires up the guards and filter —
// there is no socket to listen on in a serverless function.
import type { Request, Response } from "express";
import { createApp } from "../src/bootstrap";

type ExpressHandler = (req: Request, res: Response) => void;

let handler: ExpressHandler | null = null;

export default async function (req: Request, res: Response) {
  if (!handler) {
    const app = await createApp();
    await app.init();
    handler = app.getHttpAdapter().getInstance() as ExpressHandler;
  }
  return handler(req, res);
}
