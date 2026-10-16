import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import {
  CurrentGuest,
  GuestSessionGuard,
} from "../../common/guards/guest-session.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { GuestContext } from "../../common/utils/guest-token";
import type { UserContext } from "../../common/types/user-context";
import {
  type CreateFeedbackInput,
  createFeedbackSchema,
  type FeedbackQueryInput,
  feedbackQuerySchema,
} from "./feedback.schema";
import { FeedbackService } from "./feedback.service";

@Controller("feedbacks")
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  /**
   * Protected route for staff to list customer feedbacks.
   */
  @Get()
  async listFeedbacks(
    @CurrentUser() user: UserContext,
    @Query(new ZodValidationPipe(feedbackQuerySchema)) query: FeedbackQueryInput,
  ) {
    const data = await this.service.listFeedbacks(user, query);
    return { success: true, data };
  }

  /**
   * Protected route for staff to view feedback metrics summary.
   */
  @Get("summary")
  async getSummary(
    @CurrentUser() user: UserContext,
    @Query("tenantId") tenantId?: string,
  ) {
    const data = await this.service.getSummary(user, tenantId);
    return { success: true, data };
  }

  /**
   * Guest feedback endpoint: allows guest at table to submit rating and comments.
   */
  @Public()
  @UseGuards(GuestSessionGuard)
  @Post("public")
  async createGuestFeedback(
    @CurrentGuest() guest: GuestContext,
    @Body(new ZodValidationPipe(createFeedbackSchema)) body: CreateFeedbackInput,
  ) {
    const data = await this.service.createFeedback(
      {
        ...body,
        sessionId: guest.sessionId,
        tableId: guest.tableId,
      },
      guest.tenantId,
    );
    return { success: true, data, message: "Terima kasih atas ulasan Anda!" };
  }
}

