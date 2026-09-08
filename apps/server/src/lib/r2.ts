import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@dio-sys-be/env/server";
import { AppError } from "@/utils/app-error";

/**
 * Cloudflare R2 storage (S3-compatible). All configuration comes from env vars;
 * if any are missing the upload endpoints fail with a clear 503 instead of the
 * whole server refusing to boot.
 */
interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

let cachedClient: S3Client | null = null;

const getConfig = (): R2Config => {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_PUBLIC_URL,
  } = env;

  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET_NAME ||
    !R2_PUBLIC_URL
  ) {
    throw new AppError(
      "Image storage is not configured. Set the R2_* environment variables.",
      503,
    );
  }

  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET_NAME,
    publicUrl: R2_PUBLIC_URL.replace(/\/+$/, ""),
  };
};

const getClient = (config: R2Config): S3Client => {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return cachedClient;
};

/** True when every R2 env var is present. */
export const isR2Configured = (): boolean => {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
};

/**
 * Uploads a buffer to R2 under `key` and returns its public URL.
 * Throws AppError(503) if storage isn't configured, AppError(502) on failure.
 */
export const uploadToR2 = async (
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> => {
  const config = getConfig();
  const client = getClient(config);

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (err) {
    console.error("R2 upload failed:", err);
    throw new AppError("Failed to store image", 502);
  }

  return `${config.publicUrl}/${key}`;
};
