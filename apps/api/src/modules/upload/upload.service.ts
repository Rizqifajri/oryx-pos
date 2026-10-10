import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { AppError } from "../../common/errors/app-error";
import { getPresignedUploadUrl } from "../../common/lib/r2";
import type { UserContext } from "../../common/types/user-context";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

interface PresignInput {
  contentType: string;
  size: number;
}

@Injectable()
export class UploadService {
  /**
   * Validates the requested image metadata and returns a presigned PUT URL so the
   * client can upload straight to R2 (the file never passes through this server),
   * along with the public URL the object will be served from once uploaded. The
   * client MUST PUT with the same Content-Type reported here.
   */
  async createMenuImageUpload(
    ctx: UserContext,
    input: PresignInput,
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    const ext = EXT_BY_TYPE[input.contentType];
    if (!ext) {
      throw new AppError("Only JPEG, PNG, WebP, or GIF images are allowed", 400);
    }

    if (!Number.isFinite(input.size) || input.size <= 0) {
      throw new AppError("A valid image size is required", 400);
    }

    if (input.size > MAX_BYTES) {
      throw new AppError("Image must be 5 MB or smaller", 400);
    }

    const scope = ctx.tenantId ?? "global";
    const key = `menus/${scope}/${randomUUID()}.${ext}`;

    return getPresignedUploadUrl(key, input.contentType);
  }
}
