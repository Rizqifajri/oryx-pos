import { createApp } from "./bootstrap";

// CommonJS output, so no top-level await.
async function bootstrap() {
  const app = await createApp();
  await app.listen(3000);
  console.log("Server is running on http://localhost:3000");
}

void bootstrap();
