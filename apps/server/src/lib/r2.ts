import {
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
    // Cloudflare R2 does not support the flexible-checksum trailers that
    // @aws-sdk/client-s3 sends by default (>=3.729). Leaving these on makes
    // PutObject fail or store a corrupted, aws-chunked body. Only compute a
    // checksum when the operation strictly requires it.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
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

/** How long a presigned upload URL stays valid (seconds). */
const PRESIGN_EXPIRES_IN = 5 * 60; // 5 minutes

/**
 * Generates a presigned PUT URL so the client can upload `key` directly to R2,
 * plus the public URL the object will be served from once uploaded. The client
 * must PUT with the same `Content-Type` used to sign, or R2 rejects the request.
 * Throws AppError(503) if storage isn't configured, AppError(502) on failure.
 */
export const getPresignedUploadUrl = async (
  key: string,
  contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string }> => {
  const config = getConfig();
  const client = getClient(config);

  try {
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
      { expiresIn: PRESIGN_EXPIRES_IN },
    );

    return { uploadUrl, publicUrl: `${config.publicUrl}/${key}` };
  } catch (err) {
    console.error("R2 presign failed:", err);
    throw new AppError("Failed to prepare image upload", 502);
  }
};

/**
 * Applies a CORS policy to the bucket so browsers can PUT directly to presigned
 * URLs from the given origins. Without this, the preflight OPTIONS request R2
 * receives for a cross-origin PUT is rejected with 403. Run once per bucket (or
 * whenever the allowed origins change).
 */
export const setBucketCors = async (origins: string[]): Promise<void> => {
  const config = getConfig();
  const client = getClient(config);

  await client.send(
    new PutBucketCorsCommand({
      Bucket: config.bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: origins,
            AllowedMethods: ["PUT", "GET", "HEAD"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );
};
