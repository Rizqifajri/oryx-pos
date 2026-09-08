import { randomUUID } from "node:crypto";
import type { UserContext } from "@/types/user-context";
import { AppError } from "@/utils/app-error";
import { uploadToR2 } from "@/lib/r2";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

interface UploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/**
 * Validates an uploaded image and stores it in R2 under a tenant-scoped key,
 * returning its public URL. Validation mirrors what the old frontend route did,
 * but the file never touches the web server or local disk.
 */
export const uploadMenuImage = async (
  ctx: UserContext,
  file: UploadFile | undefined,
): Promise<{ url: string }> => {
  if (!file) {
    throw new AppError("No image file provided", 400);
  }

  const ext = EXT_BY_TYPE[file.mimetype];
  if (!ext) {
    throw new AppError(
      "Only JPEG, PNG, WebP, or GIF images are allowed",
      400,
    );
  }

  if (file.size > MAX_BYTES) {
    throw new AppError("Image must be 5 MB or smaller", 400);
  }

  const scope = ctx.tenantId ?? "global";
  const key = `menus/${scope}/${randomUUID()}.${ext}`;

  const url = await uploadToR2(key, file.buffer, file.mimetype);
  return { url };
};
