import { Controller, Get } from "@nestjs/common";
import { Public } from "./common/decorators/public.decorator";

@Controller()
export class AppController {
  /**
   * Health check. Registered outside the /api/v1 prefix (see bootstrap.ts) so
   * the URL and body match the Express root route exactly.
   */
  @Public()
  @Get()
  getRoot() {
    return { success: true, message: "dio-sys-be is running" };
  }
}
