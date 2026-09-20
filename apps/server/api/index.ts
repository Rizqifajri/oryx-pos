// Vercel serverless entrypoint. Vercel treats any file under `api/` as a
// function; an Express app is itself a (req, res) handler, so exporting it as
// default is all that's needed. This deliberately imports `../src/app` (which
// only builds the app) and NOT `../src/index.ts` (which calls app.listen) —
// there is no long-running server to listen on in a serverless function.
import app from "../src/app";

export default app;
