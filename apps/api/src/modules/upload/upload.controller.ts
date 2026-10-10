import { Body, Controller, Post } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { AppError } from "../../common/errors/app-error";
import type { UserContext } from "../../common/types/user-context";
import { UploadService } from "./upload.service";

const presignSchema = z.object({
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});

@Controller("uploads")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // Returns a presigned PUT URL so the client uploads the image straight to R2;
  // the file never passes through this server.
  //
  // This validates with safeParse rather than the ZodValidationPipe on purpose:
  // the Express controller reported its own message for a bad body, and the
  // frontend surfaces `message` verbatim.
  @Post("menu")
  @RequirePermissions("menu:manage", "menu:create", "menu:update")
  async createMenuImageUpload(
    @CurrentUser() user: UserContext,
    @Body() body: unknown,
  ) {
    const parsed = presignSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("contentType and size are required", 400);
    }

    const data = await this.uploadService.createMenuImageUpload(
      user,
      parsed.data,
    );
    return { success: true, data };
  }
}
