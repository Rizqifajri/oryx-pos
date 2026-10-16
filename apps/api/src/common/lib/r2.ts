import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@dio-sys-be/env/server";
import { AppError } from "../errors/app-error";

/**
 * Cloudflare R2 storage (S3-compatible). All configuration comes from env vars;
 * if any are missing the upload endpoints fail with a clear 503 instead of the
 * whole server refusing to boot.
 *
 * Images are stored as object keys (e.g. `menus/<tenant>/<id>.jpg`) and served
 * as presigned GET URLs on `<account>.r2.cloudflarestorage.com`, never through
 * the public `*.r2.dev` domain, which some DNS filters block.
 */
interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Legacy public base (r2.dev or custom domain); only used to read old URLs. */
  publicUrl: string | null;
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
    !R2_BUCKET_NAME
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
    publicUrl: R2_PUBLIC_URL ? R2_PUBLIC_URL.replace(/\/+$/, "") : null,
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
 * Uploads a buffer to R2 under `key` and returns the key to store.
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

  return key;
};

/**
 * Turns a stored image value into its R2 object key. Accepts a bare key (what
 * we store now), an old public URL (`*.r2.dev` or the R2_PUBLIC_URL domain), or
 * a presigned URL we handed out (sent back unchanged when a menu is re-saved).
 * Returns null for anything that isn't ours, e.g. an external image URL.
 */
export const toImageKey = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return value;
  if (!isR2Configured()) return null;

  const config = getConfig();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname;
  let path = url.pathname.replace(/^\/+/, "");

  if (host.endsWith(".r2.cloudflarestorage.com")) {
    // Path-style URLs carry the bucket as the first segment.
    if (!host.startsWith(`${config.bucket}.`)) {
      if (!path.startsWith(`${config.bucket}/`)) return null;
      path = path.slice(config.bucket.length + 1);
    }
  } else if (
    !host.endsWith(".r2.dev") &&
    !(config.publicUrl && host === new URL(config.publicUrl).hostname)
  ) {
    return null;
  }

  return path ? decodeURIComponent(path) : null;
};

/**
 * Deletes the object behind a stored image value. Best-effort: values that
 * aren't ours are ignored, and storage errors are logged but not thrown, so
 * cleanup never blocks the primary operation (e.g. replacing a menu image).
 */
export const deleteFromR2 = async (value: string): Promise<void> => {
  const key = toImageKey(value);
  if (!key) return;

  try {
    const config = getConfig();
    await getClient(config).send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
    );
  } catch (err) {
    console.error("R2 delete failed:", err);
  }
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns a presigned GET URL for a stored image value. The signature time is
 * pinned to the start of the current UTC day and the URL lives two days, so it
 * stays identical (and browser-cacheable) all day and is always valid for at
 * least 24h after it was handed out. Values that aren't ours pass through.
 */
export const signImageUrl = async (
  value: string | null | undefined,
): Promise<string | null | undefined> => {
  const key = toImageKey(value);
  if (!key) return value;

  const config = getConfig();
  try {
    return await getSignedUrl(
      getClient(config),
      new GetObjectCommand({ Bucket: config.bucket, Key: key }),
      {
        expiresIn: (2 * DAY_MS) / 1000,
        signingDate: new Date(Math.floor(Date.now() / DAY_MS) * DAY_MS),
      },
    );
  } catch (err) {
    console.error("R2 sign failed:", err);
    return value;
  }
};

/** How long a presigned upload URL stays valid (seconds). */
const PRESIGN_EXPIRES_IN = 5 * 60; // 5 minutes

/**
 * Generates a presigned PUT URL so the client can upload `key` directly to R2. The client
 * must PUT with the same `Content-Type` used to sign, or R2 rejects the request.
 * Throws AppError(503) if storage isn't configured, AppError(502) on failure.
 */
export const getPresignedUploadUrl = async (
  key: string,
  contentType: string,
): Promise<string> => {
  const config = getConfig();
  const client = getClient(config);

  try {
    return await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
      { expiresIn: PRESIGN_EXPIRES_IN },
    );
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
